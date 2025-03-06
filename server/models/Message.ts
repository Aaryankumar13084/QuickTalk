import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: false
  },
  content: { 
    type: String, 
    required: true 
  },
  fileUrl: {
    type: String,
    required: false
  },
  fileName: {
    type: String,
    required: false
  },
  fileType: {
    type: String,
    required: false
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});

// Message must have either recipientId or groupId
messageSchema.pre('save', function(next) {
  if (!this.recipientId && !this.groupId) {
    next(new Error('Message must have either a recipient or a group'));
  } else if (this.recipientId && this.groupId) {
    next(new Error('Message cannot have both recipient and group'));
  } else {
    next();
  }
});

export const Message = mongoose.model('Message', messageSchema);