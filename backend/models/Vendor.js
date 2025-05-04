
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const clientSchema = new Schema({
    name : {type : String},
    contactNumber : {type : String},
})

const vendorSchema = new Schema({
    vendorName : {type : String},
    vendorCompany : {type : String},
    brandDealing : {type : String },
    location : {type : String },
    clients : {type : [clientSchema] , default : [] },
    gst : {type : String},
    bankName : {type : String },
    accountNumber : {type : String },
    ifscCode : {type : String },
    createdBy : {type : Schema.Types.ObjectId, ref : "User"},
    createdAt : {type : Date, default : Date.now},
    updatedAt : {type : Date, default : Date.now},
    updatedBy : {type : Schema.Types.ObjectId, ref : "User"},
    deleted : {type : Boolean, default : false},
    deletedAt : {type : Date},
    deletedBy : {type : Schema.Types.ObjectId, ref : "User"},
})


module.exports = mongoose.model("Vendor", vendorSchema);