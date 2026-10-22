import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Exchange from '../models/Exchange.js';
import Review from '../models/Review.js';

const people = [
 { name:'Priya Sharma', email:'priya.demo@example.com', location:'Delhi, India', bio:'Product designer helping people turn ideas into clear, intuitive experiences.', teachSkills:[['UI/UX Design','Design','Advanced'],['Figma','Design','Advanced']], learnSkills:[['React','Development','Beginner']] },
 { name:'Rahul Verma', email:'rahul.demo@example.com', location:'Bengaluru, India', bio:'Full-stack developer who loves building useful things and sharing what I learn.', teachSkills:[['React','Development','Advanced'],['Node.js','Development','Intermediate']], learnSkills:[['Public Speaking','Communication','Beginner']] },
 { name:'Ananya Singh', email:'ananya.demo@example.com', location:'Lucknow, India', bio:'Python enthusiast exploring data, automation and the stories behind numbers.', teachSkills:[['Python','Development','Intermediate'],['Data Analysis','Data','Intermediate']], learnSkills:[['UI/UX Design','Design','Beginner']] },
 { name:'Kabir Khan', email:'kabir.demo@example.com', location:'Mumbai, India', bio:'Helping beginners understand Java, problem solving and interview fundamentals.', teachSkills:[['Java','Development','Advanced'],['DSA','Development','Intermediate']], learnSkills:[['Video Editing','Creative','Beginner']] },
 { name:'Meera Nair', email:'meera.demo@example.com', location:'Pune, India', bio:'Visual storyteller, brand designer and believer in learning in public.', teachSkills:[['Graphic Design','Design','Advanced'],['Canva','Design','Advanced']], learnSkills:[['Python','Development','Beginner']] },
 { name:'Aman Gupta', email:'aman.demo@example.com', location:'Jaipur, India', bio:'I make complex topics easier through practical examples and small projects.', teachSkills:[['Excel','Data','Advanced'],['SQL','Data','Intermediate']], learnSkills:[['React','Development','Intermediate']] }
];
try {
 await connectDB();
 const users=[];
 for (const p of people) {
  let user=await User.findOne({email:p.email});
  if (!user) {
   user=new User({ name:p.name,email:p.email,username:p.email,location:p.location,bio:p.bio,isDemo:true,
    teachSkills:p.teachSkills.map(([name,category,level])=>({name,category,level})),learnSkills:p.learnSkills.map(([name,category,level])=>({name,category,level})) });
   await User.register(user,'DemoPass!2026');
  } else if (!user.isDemo) { console.log(`Skipping non-demo account ${p.email}`); users.push(user); continue; }
  users.push(user);
 }
 const [priya,rahul,ananya]=users;
 if (priya && rahul) {
  const exists=await Exchange.exists({requester:rahul._id,recipient:priya._id,offerSkill:'React',requestSkill:'UI/UX Design'});
  if(!exists) await Exchange.create({requester:rahul._id,recipient:priya._id,offerSkill:'React',requestSkill:'UI/UX Design',message:'I can help with React components if you can show me your Figma workflow.',status:'pending'});
 }
 if (priya && ananya) {
  const exists=await Exchange.exists({requester:priya._id,recipient:ananya._id,offerSkill:'Figma',requestSkill:'Python'});
  if(!exists) await Exchange.create({requester:priya._id,recipient:ananya._id,offerSkill:'Figma',requestSkill:'Python',message:'Would love to exchange design feedback for Python basics.',status:'accepted'});
 }
 console.log('\nDemo data ready. Demo password for all demo accounts: DemoPass!2026');
 for(const p of people) console.log(`  ${p.email}`);
 console.log('\nDo not use demo credentials in production.');
} catch(err) { console.error(err); process.exitCode=1; }
finally { await mongoose.disconnect(); }
