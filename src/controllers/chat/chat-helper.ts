import mongoose, { Mongoose } from 'mongoose';
import { UserConversation } from '../../models/social-media/chat.model';

export const getConversationIdFromParticipants = async (participantIds: any[]) => {
    try {
        let conversation = await UserConversation.findOne({ participants: { $all: participantIds } });
        if (!conversation) {
            conversation = await UserConversation.create({
                participants: participantIds
            });
        }
        return conversation;
    } catch (error) {
        throw error;
    }

}