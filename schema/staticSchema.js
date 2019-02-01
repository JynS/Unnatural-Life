var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var staticSchema = new Schema({
    name: String,
    html: String
});

staticSchema.static('upDate', function(id, values, cb, next) {

    this.update({_id: id}, values, cb);
});

var Static = mongoose.model('Static', staticSchema);

module.exports = Static;
