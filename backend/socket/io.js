// Tiny holder so services can emit without importing the socket server (avoids circular imports)
let io = null;
export const setIO = (instance) => { io = instance; };
export const getIO = () => io;
export const emitToUser = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);
