import client from './client'

const getInternalChatmessageFromChatflow = (id) => client.get(`/internal-chatmessage/${id}`)
const getAllChatmessageFromChatflow = (id, params = {}) =>
    client.get(`/chatmessage/${id}`, { params: { order: 'DESC', feedback: true, ...params } })
const getChatmessageFromPK = (id, params = {}) => client.get(`/chatmessage/${id}`, { params: { order: 'ASC', feedback: true, ...params } })
const deleteChatmessage = (id, params = {}) => client.delete(`/chatmessage/${id}`, { params: { ...params } })
const getStoragePath = () => client.get(`/get-upload-path`)

export default {
    getInternalChatmessageFromChatflow,
    getAllChatmessageFromChatflow,
    getChatmessageFromPK,
    deleteChatmessage,
    getStoragePath
}
