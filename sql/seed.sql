-- Bridgeway Careers sample content, taken from the demo. Run after schema.sql.
-- Everything here can be edited or deleted later from the admin dashboard.

insert into categories (name,color,image_url,sort) values ('Healthcare','#ff6b57','https://images.unsplash.com/photo-1765896387387-0538bc9f997e?auto=format&fit=crop&crop=faces,edges&w=320&h=320&q=70',1) on conflict (name) do nothing;
insert into categories (name,color,image_url,sort) values ('Engineering','#1b6ef3','https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&crop=faces,edges&w=320&h=320&q=70',2) on conflict (name) do nothing;
insert into categories (name,color,image_url,sort) values ('IT and software','#7a5af8','https://images.unsplash.com/photo-1763568258696-32147bb44379?auto=format&fit=crop&crop=faces,edges&w=320&h=320&q=70',3) on conflict (name) do nothing;
insert into categories (name,color,image_url,sort) values ('Hospitality','#e89a00','https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&crop=faces,edges&w=320&h=320&q=70',4) on conflict (name) do nothing;
insert into categories (name,color,image_url,sort) values ('Construction','#16b8a6','https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&crop=faces,edges&w=320&h=320&q=70',5) on conflict (name) do nothing;
insert into categories (name,color,image_url,sort) values ('Agriculture','#3dbb6a','https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&crop=faces,edges&w=320&h=320&q=70',6) on conflict (name) do nothing;
insert into categories (name,color,image_url,sort) values ('Logistics','#0b1f4b','https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&crop=faces,edges&w=320&h=320&q=70',7) on conflict (name) do nothing;
insert into destinations (name,image_url,route_text,typical_time,sort) values ('Europe','https://images.unsplash.com/photo-1534964542054-81ea785bde49?auto=format&fit=crop&crop=faces,edges&w=1200&q=70','Employer work permits and skilled-worker routes.','6–12 weeks',1) on conflict (name) do nothing;
insert into destinations (name,image_url,route_text,typical_time,sort) values ('Australia','https://images.unsplash.com/photo-1674043581356-af41daf2ecee?auto=format&fit=crop&crop=faces,edges&w=1200&q=70','Skilled and employer-sponsored routes.','8–16 weeks',2) on conflict (name) do nothing;
insert into destinations (name,image_url,route_text,typical_time,sort) values ('Canada','https://images.unsplash.com/photo-1671752862966-3e28f22453cd?auto=format&fit=crop&crop=faces,edges&w=1200&q=70','Work permit and permanent residence routes.','8–20 weeks',3) on conflict (name) do nothing;

insert into employers (name,country,verified) select 'Nordlicht Care','Europe',true where not exists (select 1 from employers where name='Nordlicht Care');
insert into employers (name,country,verified) select 'Rhein Metallbau','Europe',true where not exists (select 1 from employers where name='Rhein Metallbau');
insert into employers (name,country,verified) select 'Maple Health','Canada',true where not exists (select 1 from employers where name='Maple Health');
insert into employers (name,country,verified) select 'Southern Cross Electrical','Australia',true where not exists (select 1 from employers where name='Southern Cross Electrical');
insert into employers (name,country,verified) select 'Northgrid Labs','Canada',true where not exists (select 1 from employers where name='Northgrid Labs');
insert into employers (name,country,verified) select 'Hotel Aurelia','Europe',true where not exists (select 1 from employers where name='Hotel Aurelia');
insert into employers (name,country,verified) select 'Outback Fabrication','Australia',true where not exists (select 1 from employers where name='Outback Fabrication');
insert into employers (name,country,verified) select 'Harvest Valley','Canada',true where not exists (select 1 from employers where name='Harvest Valley');
insert into employers (name,country,verified) select 'EuroLogix','Europe',true where not exists (select 1 from employers where name='EuroLogix');
insert into employers (name,country,verified) select 'Harbour Table','Australia',true where not exists (select 1 from employers where name='Harbour Table');

insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Care assistant',(select id from employers where name='Nordlicht Care' limit 1),(select id from destinations where name='Europe'),(select id from categories where name='Healthcare'),'Berlin','€2,600/mo',1);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('CNC machinist',(select id from employers where name='Rhein Metallbau' limit 1),(select id from destinations where name='Europe'),(select id from categories where name='Engineering'),'Stuttgart','€3,200/mo',2);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Registered nurse',(select id from employers where name='Maple Health' limit 1),(select id from destinations where name='Canada'),(select id from categories where name='Healthcare'),'Calgary','CA$38/hr',3);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Electrician',(select id from employers where name='Southern Cross Electrical' limit 1),(select id from destinations where name='Australia'),(select id from categories where name='Construction'),'Perth','A$44/hr',4);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Software developer',(select id from employers where name='Northgrid Labs' limit 1),(select id from destinations where name='Canada'),(select id from categories where name='IT and software'),'Toronto','CA$85k/yr',5);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Hotel receptionist',(select id from employers where name='Hotel Aurelia' limit 1),(select id from destinations where name='Europe'),(select id from categories where name='Hospitality'),'Lisbon','€1,700/mo',6);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Welder',(select id from employers where name='Outback Fabrication' limit 1),(select id from destinations where name='Australia'),(select id from categories where name='Construction'),'Brisbane','A$40/hr',7);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Farm technician',(select id from employers where name='Harvest Valley' limit 1),(select id from destinations where name='Canada'),(select id from categories where name='Agriculture'),'Saskatoon','CA$29/hr',8);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Warehouse operator',(select id from employers where name='EuroLogix' limit 1),(select id from destinations where name='Europe'),(select id from categories where name='Logistics'),'Rotterdam','€2,400/mo',9);
insert into jobs (title,employer_id,destination_id,category_id,city,salary,sort) values ('Chef de partie',(select id from employers where name='Harbour Table' limit 1),(select id from destinations where name='Australia'),(select id from categories where name='Hospitality'),'Sydney','A$32/hr',10);

insert into content_items (section,title,body,value,extra,image_url,sort) values ('hero_ticks','No fees before an offer',null,null,null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('hero_ticks','Verified employers',null,null,null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('hero_ticks','Licensed visa partners',null,null,null,null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('about_items','Jobs in Europe, Australia and Canada','Employers are verified against national registries before you see them.',null,null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('about_items','Visa and permit applications','Licensed partners prepare and file with you, with every step tracked.',null,null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('about_items','Government paperwork','Certificates, clearances, translations and apostilles, checked twice.',null,null,null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('about_items','Support until you land','Housing, registration and banking help in your first weeks.',null,null,null,4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('stats','Applicants registered',null,'1,200+',null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('stats','Placements completed',null,'300+',null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('stats','Destination regions',null,'3',null,null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('stats','Open roles',null,'86',null,null,4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('services','Job search','Verified roles abroad, matched to your skills.',null,'search',null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('services','Visa application','Forms, filing and follow-up with licensed partners.',null,'document',null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('services','Document legalisation','Apostille, notarising and certified translation.',null,'shield',null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('services','Clearances and medicals','Police certificates and approved health checks.',null,'clipboard',null,4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('services','Relocation support','Housing, banking and a soft landing.',null,'home',null,5);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('how_steps','Eligibility','Free quiz',null,null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('how_steps','Profile','CV and documents',null,null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('how_steps','Interview','Meet employers',null,null,null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('how_steps','Offer','Signed and verified',null,null,null,4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('how_steps','Visa','Filed by partners',null,null,null,5);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('how_steps','Relocation','Land with support',null,null,null,6);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('placed','Amara O.',null,'Canada','Registered nurse','https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('placed','Daniel K.',null,'Australia','Electrician','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('placed','Grace M.',null,'Europe','Care assistant','https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('placed','Priya S.',null,'Canada','Developer','https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('testimonials','[CLIENT NAME]','Sample testimonial. Replace with a real quote from a client who gave permission.','Europe','[ROLE]','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('testimonials','[CLIENT NAME]','Sample testimonial. Short, specific stories about the process feel most trustworthy.','Australia','[ROLE]','https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('testimonials','[CLIENT NAME]','Sample testimonial. Include the person’s first name, role and destination.','Canada','[ROLE]','https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('news','Five documents to prepare before your visa interview','Requirements differ by country and route, so your case manager will confirm the exact list for you. These are the documents most applications need.

A passport with enough validity left for the whole permit period. Check the expiry date early, because renewing can take weeks.

A police clearance certificate from every country you have lived in for the period the authority asks about. Allow time, as some offices are slow.

Diplomas and certificates, translated by a certified translator and legalised with an apostille where required. Keep the originals safe and send clear scans.

Your signed employment contract or offer letter, and a medical examination from an approved clinic if your route needs one. Some routes also ask for proof of funds.

Upload each item to your dashboard as you collect it. We check every document twice before anything is filed.',null,'Guide','https://images.unsplash.com/photo-1534964542054-81ea785bde49?auto=format&fit=crop&crop=faces,edges&w=1200&q=70',1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('news','How to check that a recruiter is genuine','Fake recruiters target people who want to work abroad. A few checks protect you.

Never pay for a job offer. A genuine agency does not ask for fees before a verified, signed offer, and it never asks for payment by gift card, crypto or personal transfer.

Ask for the employer’s registered company name and check it in the official business register of that country. A real employer is easy to find.

Look at the email address. Messages from free webmail accounts or look-alike domains are a warning sign. Ask for the recruiter’s licence number and check it with the government register.

Get everything in writing: the contract, the salary, the fees and the steps. If someone pushes you to decide today, stop and ask questions.

If something feels wrong, use the "Report suspicious contact" link in our footer.',null,'Guide','https://images.unsplash.com/photo-1671752862966-3e28f22453cd?auto=format&fit=crop&crop=faces,edges&w=1200&q=70',2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('visa_steps','Eligibility','Confirm the right route',null,null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('visa_steps','Documents','Collect and check',null,null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('visa_steps','Legalise','Translate, apostille',null,null,null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('visa_steps','File','Partner submits',null,null,null,4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('visa_steps','Follow up','Updates at each stage',null,null,null,5);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('visa_steps','Decision','Result and travel prep',null,null,null,6);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('checklist','Passport',null,'After offer',null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('checklist','Police clearance',null,'Per country',null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('checklist','Medical exam',null,'Approved clinic',null,null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('checklist','Diplomas, translated',null,'Certified',null,null,4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('checklist','Employment contract',null,'From employer',null,null,5);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('checklist','Proof of funds',null,'If required',null,null,6);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('fees','Eligibility and routes',null,'Free',null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('fees','Document preparation',null,'$[FEE]',null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('fees','Filing through partner',null,'$[FEE]',null,null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('fees','Post-approval support',null,'$[FEE]',null,null,4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('faq','Who files my application?','A licensed immigration partner files. We prepare and check.',null,null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('faq','Can you guarantee approval?','No. Governments decide visas. We never promise approval.',null,null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('values','No fees before an offer','You pay only after a signed, verified job offer.',null,'shield',null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('values','Everything in writing','Fees, steps and limits are stated up front.',null,'document',null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('values','Named people','Every advisor is listed with license details.',null,'clipboard',null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('team','[NAME]','License [NO.]',null,'Founder','https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('team','[NAME]','License [NO.]',null,'Senior recruiter','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('team','[NAME]','[CREDENTIAL]',null,'Visa case manager','https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('team','[NAME]','Speaks [LANGUAGES]',null,'Client support','https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&crop=faces,edges&w=240&h=240&q=70',4);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('doc_types','CV',null,null,null,null,1);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('doc_types','Diploma',null,null,null,null,2);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('doc_types','Police clearance',null,null,null,null,3);
insert into content_items (section,title,body,value,extra,image_url,sort) values ('doc_types','Passport',null,null,null,null,4);
