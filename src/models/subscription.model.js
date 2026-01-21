import mongoose, { Schema } from 'mongoose'

const subscriptionSchema = new Schema({

    subscriber:{
        type: Schema.Types.ObjectId, //One who is subscribing
        ref:"User"
    },
    channel:{
        type: Schema.Types.ObjectId, //Whome to subscribe
        ref:"User"
    }
    //subscribed ?
    // subscriber count

}, { timestemps: true })

export const Subscription = mongoose.model('Subscription', subscriptionSchema)