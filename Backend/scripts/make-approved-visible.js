// run: node backend/scripts/make-approved-visible.js
const mongoose = require('mongoose');
require('dotenv').config();
const Service = require('../models/Service');

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser:true, useUnifiedTopology:true });
  console.log('Connected to DB');

  // Set visible=true for services with status 'approved'
  const res = await Service.updateMany({ status: 'approved' }, { $set: { visible: true }});
  console.log('modifiedCount:', res.modifiedCount);

  // Optionally hide all others
  const hide = await Service.updateMany({ status: { $ne: 'approved' } }, { $set: { visible: false }});
  console.log('hid others modifiedCount:', hide.modifiedCount);

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => { console.error(err); process.exit(1); });
