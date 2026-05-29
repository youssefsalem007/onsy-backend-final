import { parse } from 'csv-parse';
import { v4 as uuidv4 } from 'uuid';
import EEGReading from '../../DB/models/EEGReading.model.js';
import successResponse from '../../common/utils/response.success.js';
import { triggerRealtimeAnalysis } from '../../services/analysis.service.js';

export const uploadEEGData = (req, res, next) => {
  if (!req.file || !req.file.buffer) {
    return next(new Error('No CSV file uploaded.', { cause: 400 }));
  }

  const sessionId = uuidv4();
  const userId = req.auth._id;

  // Strip BOM if present, convert to string
  let fileContent = req.file.buffer.toString('utf-8');
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
  }

  // The Emotiv INSIGHT2 CSV has a metadata line as line 1, e.g.:
  // "title:..., start timestamp:..., headset type:INSIGHT2, ..."
  // The REAL header row starts with "Timestamp," — find it by index.
  const rawLines = fileContent.split(/\r?\n/);

  const headerIndex = rawLines.findIndex(line =>
    /^Timestamp,/i.test(line.trim())
  );

  if (headerIndex === -1) {
    console.error('CSV header row not found. First 3 lines:', rawLines.slice(0, 3));
    return next(new Error('Invalid CSV: Could not find the Timestamp header row.', { cause: 400 }));
  }

  // Slice from the real header row downward and rejoin
  const cleanCsv = rawLines.slice(headerIndex).join('\n');

  parse(cleanCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  }, (err, records) => {
    if (err) {
      console.error('CSV Parse Error:', err.message);
      return next(new Error(`Failed to parse CSV: ${err.message}`, { cause: 400 }));
    }

    if (!records || records.length === 0) {
      return next(new Error('CSV file has no data rows.', { cause: 400 }));
    }

    // Log detected columns once for debugging
    console.log('[EEG Upload] Detected columns:', Object.keys(records[0]));

    const readings = [];

    const parseMetric = (row, keys) => {
      for (const key of keys) {
        if (row[key] !== undefined && row[key] !== '') {
          return Number(row[key]);
        }
      }
      return null;
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      // Exact column names from INSIGHT2 export:
      // Timestamp, EEG.AF3, EEG.T7, EEG.Pz, EEG.T8, EEG.AF4
      // PM.Attention.Scaled, PM.Engagement.Scaled, PM.Excitement.Scaled,
      // PM.Stress.Scaled, PM.Relaxation.Scaled, PM.Interest.Scaled
      const ts = row['Timestamp'] || row['timestamp'];
      const timestamp = ts ? Number(ts) : Date.now() / 1000 + i;

      readings.push({
        userId,
        sessionId,
        timestamp,
        channels: {
          AF3: Number(row['EEG.AF3'] || row['AF3'] || row['af3']) || 0,
          T7:  Number(row['EEG.T7']  || row['T7']  || row['t7'])  || 0,
          Pz:  Number(row['EEG.Pz']  || row['Pz']  || row['pz'])  || 0,
          T8:  Number(row['EEG.T8']  || row['T8']  || row['t8'])  || 0,
          AF4: Number(row['EEG.AF4'] || row['AF4'] || row['af4']) || 0,
        },
        motion: {
          gyroX: Number(row['GYROX'] || row['gyrox'] || row['EEG.GYROX']) || 0,
          gyroY: Number(row['GYROY'] || row['gyroy'] || row['EEG.GYROY']) || 0,
        },
        metrics: {
          excitement: parseMetric(row, ['PM.Excitement.Scaled', 'Excitement', 'excitement']),
          engagement: parseMetric(row, ['PM.Engagement.Scaled', 'Engagement', 'engagement']),
          relaxation: parseMetric(row, ['PM.Relaxation.Scaled', 'Relaxation', 'relaxation']),
          interest:   parseMetric(row, ['PM.Interest.Scaled', 'Interest', 'interest']),
          stress:     parseMetric(row, ['PM.Stress.Scaled', 'Stress', 'stress']),
          focus:      parseMetric(row, ['PM.Attention.Scaled', 'Focus', 'focus']),
          longTermExcitement: parseMetric(row, ['PM.LongTermExcitement', 'LongTermExcitement']),
        }
      });
    }

    EEGReading.insertMany(readings)
      .then(async inserted => {
        try {
          await triggerRealtimeAnalysis(userId, sessionId);
        } catch (e) {
          console.error("Realtime analysis failed:", e);
        }
        successResponse({
          res,
          status: 201,
          message: 'EEG session uploaded',
          data: { sessionId, rowsInserted: inserted.length }
        });
      })
      .catch(dbErr => {
        console.error('DB insert error:', dbErr.message);
        return next(new Error('Failed to save EEG readings.', { cause: 500 }));
      });
  });
};

export const getSessionData = async (req, res, next) => {
  const { sessionId } = req.params;
  const readings = await EEGReading.find({ sessionId, userId: req.auth._id }).sort({ timestamp: 1 });
  if (!readings || readings.length === 0) {
    return next(new Error('Session not found', { cause: 404 }));
  }
  successResponse({ res, data: readings });
};

export const getLatestReading = async (req, res, next) => {
  const reading = await EEGReading.findOne({ userId: req.auth._id }).sort({ timestamp: -1 });
  if (!reading) {
    return next(new Error('No readings found', { cause: 404 }));
  }
  successResponse({ res, data: reading });
};
