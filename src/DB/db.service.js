

export const findOne = async ({model, filter = {}, select ="", options={}} ={}) => {
    return await model.findOne(filter, select, options)
}

export const create = async ({model, data} ={}) => {
    return await model.create(data)
}

export const update = async ({ model, filter = {}, update = {}, options = {} } = {}) => {
    return await model.findOneAndUpdate(filter, update, { returnDocument: "after", ...options })
}

export const deleteOne = async ({ model, filter = {}, options = {} } = {}) => {
    return await model.deleteOne(filter, options)
}

export const findById = async ({model, id, select = {}} = {}) => {
    return await model.findById(id).select(select)
}

export const findOneAndDelete = async ({model, filter = {}, options = {}} = {}) => {
    return await model.findOneAndDelete(filter, options)
}

export const find = async ({model, filter = {}, options = {}} = {}) => {
    return await model.find(filter, options)
}