export const emailTemp = (otp) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Onsy Verification Code</title>
</head>
<body style="margin:0; padding:0; background-color:#eef6f7; font-family: Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">

        <!-- Main Card -->
        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:14px; overflow:hidden;">

          <!-- Top Bar -->
          <tr>
            <td style="background-color:#5AA8B1; height:6px;"></td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:35px; text-align:center;">

              <!-- Logo -->
              <h2 style="margin:0; color:#4B676C; font-weight:600;">
                Onsy
              </h2>

              <div style="height:20px;"></div>

              <!-- Title -->
              <h3 style="margin:0; color:#4B676C; font-weight:500;">
                Verification Code
              </h3>

              <!-- Message -->
              <p style="font-size:15px; color:#555; line-height:1.6; margin-top:15px;">
                Please use the code below to continue.  
                This helps us keep your account safe.
              </p>

              <!-- OTP Box -->
              <div style="margin:30px 0;">
                <div style="
                  display:inline-block;
                  background-color:#e6f3f5;
                  color:#4B676C;
                  font-size:34px;
                  letter-spacing:12px;
                  padding:18px 28px;
                  border-radius:10px;
                  font-weight:bold;
                  border:1px solid #5AA8B1;
                ">
                  ${otp}
                </div>
              </div>

              <!-- Divider -->
              <div style="margin:25px 0; height:1px; background:#e0e7e8;"></div>

              <!-- Footer note -->
              <p style="font-size:12px; color:#888; line-height:1.5;">
                If you didn’t request this code, you can safely ignore this email.
              </p>

            </td>
          </tr>

        </table>

        <div style="height:20px;"></div>

        <!-- Footer -->
        <p style="font-size:12px; color:#aaa;">
          © 2026 Onsy. All rights reserved.
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`
}