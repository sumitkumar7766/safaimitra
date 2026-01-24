const { model } = require("mongoose");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const AdminSchema = new Schema({
    name: {
        type: String,
        require: true,
    },
    email: {
        type: String,
        require: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    role: { type: String, default: 'admin' },
    office: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "office"
    },

});

AdminSchema.plugin(passportLocalMongoose);
const AdminModel = new model("admin", AdminSchema);
module.exports = AdminModel;