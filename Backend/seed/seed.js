const mongoose = require('mongoose');
const Category = require('../models/ServiceCategory');
const Provider = require('../models/Provider');
const User = require('../models/User');

async function run(){
  await mongoose.connect(process.env.MONGO_URI);
  await Category.deleteMany({});
  await Provider.deleteMany({});
  await User.deleteMany({});

  const electrician = await Category.create({ name: 'Electrician', keywords: ['electrical','wiring','switch','fan']});
  const plumber = await Category.create({ name: 'Plumber', keywords: ['plumbing','leak','tap','drain']});
  const cleaning = await Category.create({ name: 'Cleaning', keywords: ['cleaning','housekeeping','deep clean','sanitize']});
  const appliances = await Category.create({ name: 'Appliances', keywords: ['appliance','repair','fridge','washing machine']});
  const painter = await Category.create({ name: 'Painter', keywords: ['painting','decor','wall paint','finish']});
  const acRepair = await Category.create({ name: 'AC Repair', keywords: ['ac','cooling','hvac','temperature']});
  const maidService = await Category.create({ name: 'Maid Service', keywords: ['maid','housekeeping','domestic','cleaning'] });
  const cook = await Category.create({ name: 'Cook', keywords: ['cook','chef','cooking','meal','food'] });

  const user = await User.create({ name:'p1', email:'p1@example.com', passwordHash:'x', role:'vendor', location:{type:'Point', coordinates:[73.8567,18.5204]} });

  await Provider.create({
    userRef: user._id,
    businessName: 'Pune Electric',
    services: [{ name: 'Electrician', categoryId: electrician._id, keywords: ['fan','wiring'] }],
    status: 'verified',
    location: { type: 'Point', coordinates: [73.8575, 18.5220] }
  });

  await mongoose.disconnect();
  console.log('seed done');
}
run().catch(console.error);
