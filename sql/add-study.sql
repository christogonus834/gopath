-- Adds Study to a database that is already set up. Run once in Supabase > SQL Editor.
create table if not exists study_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  school text not null,
  destination_id uuid references destinations(id) on delete restrict,
  city text,
  level text,
  duration text,
  intake text,
  tuition text,
  summary text,
  image_url text,
  closed boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table applications add column if not exists kind text not null default 'job' check (kind in ('job','study'));
alter table applications add column if not exists program_id uuid references study_programs(id) on delete set null;
create unique index if not exists applications_user_program on applications(user_id, program_id) where program_id is not null;
alter table study_programs enable row level security;

-- Study sample content (replace or delete it in the admin)
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Engineering and Computer Science','University of Illinois Urbana-Champaign',(select id from destinations where name='United States'),'Urbana-Champaign, IL','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Ranked second among US public universities for international students in the Open Doors 2025 report.',1);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Undergraduate and graduate study','New York University',(select id from destinations where name='United States'),'New York, NY','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Private university in New York City with one of the largest international student communities in the country.',2);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Undergraduate and graduate study','Northeastern University',(select id from destinations where name='United States'),'Boston, MA','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Boston university where more than 12% of students are international.',3);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Undergraduate and graduate study','Columbia University',(select id from destinations where name='United States'),'New York, NY','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Ivy League university in New York City with the most international students among the Ivies.',4);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Undergraduate and graduate study','University of Washington',(select id from destinations where name='United States'),'Seattle, WA','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Public research university in Seattle that hosted nearly 11,000 international students in 2024/25.',5);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Undergraduate and graduate study','Purdue University',(select id from destinations where name='United States'),'West Lafayette, IN','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Public university in Indiana where about 10% of undergraduates are international students.',6);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Engineering, Business and Medicine','University of Toronto',(select id from destinations where name='Canada'),'Toronto, ON','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Canada''s largest university, with more than 25,000 international students from over 150 countries.',7);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Medicine, Law and Sciences','McGill University',(select id from destinations where name='Canada'),'Montreal, QC','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Montreal university where international students make up a large share of the student body.',8);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Computer Science, Forestry and Arts','University of British Columbia',(select id from destinations where name='Canada'),'Vancouver, BC','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','One of Canada''s largest and most international universities, with over 65,000 students.',9);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Computer Science and Engineering (co-op)','University of Waterloo',(select id from destinations where name='Canada'),'Waterloo, ON','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Known for its co-operative education model, with strength in computer science, engineering and mathematics.',10);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Undergraduate and graduate study','University of Alberta',(select id from destinations where name='Canada'),'Edmonton, AB','Undergraduate and graduate','Varies by program','Varies by program','Ask us for current fees','Research university in Edmonton, regularly listed among Canada''s top ten universities.',11);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Business, Medicine and Engineering','University of Melbourne',(select id from destinations where name='Australia'),'Melbourne, VIC','Undergraduate and graduate','Varies by program','Usually February and July','Ask us for current fees','Australia''s highest-ranked university in the QS 2025 rankings, with a large international student community.',12);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Undergraduate and graduate study','University of Sydney',(select id from destinations where name='Australia'),'Sydney, NSW','Undergraduate and graduate','Varies by program','Usually February and July','Ask us for current fees','One of the five Australian universities that attract the most international students.',13);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Engineering, Finance and Data Science','UNSW Sydney',(select id from destinations where name='Australia'),'Sydney, NSW','Undergraduate and graduate','Varies by program','Usually February and July','Ask us for current fees','Sydney university known for engineering, finance and data science, with students from over 130 countries.',14);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Pharmacy, Education and Nursing','Monash University',(select id from destinations where name='Australia'),'Melbourne, VIC','Undergraduate and graduate','Varies by program','Usually February and July','Ask us for current fees','Melbourne university that leads Australia in international student income.',15);
insert into study_programs (title,school,destination_id,city,level,duration,intake,tuition,summary,sort) values ('Life Sciences, Mining and Biotechnology','University of Queensland',(select id from destinations where name='Australia'),'Brisbane, QLD','Undergraduate and graduate','Varies by program','Usually February and July','Ask us for current fees','Brisbane university ranked in the QS world top 40 in 2025, with over 18,000 international students.',16);
insert into content_items (section,title,body,sort) values ('study_steps','Eligibility','Pick a program and country',1);
insert into content_items (section,title,body,sort) values ('study_steps','Application','We prepare your application',2);
insert into content_items (section,title,body,sort) values ('study_steps','Admission','Receive your offer letter',3);
insert into content_items (section,title,body,sort) values ('study_steps','Visa','Student visa filed',4);
insert into content_items (section,title,body,sort) values ('study_steps','Pre-departure','Housing, funds and flights',5);
insert into content_items (section,title,body,sort) values ('study_steps','Enrolled','Start your classes',6);
insert into content_items (section,title,body,sort) values ('study_faq','Who do I pay tuition to?','Tuition is paid directly to the school, never to us. We never ask for payment by gift card or crypto.',1);
insert into content_items (section,title,body,sort) values ('study_faq','Can you guarantee admission?','No. Schools and governments decide admission and visas. We prepare your application and keep it on track.',2);
insert into content_items (section,title,extra,sort) values ('doc_types','Academic transcript','study',5);
insert into content_items (section,title,extra,sort) values ('doc_types','Statement of purpose','study',6);
insert into content_items (section,title,extra,sort) values ('doc_types','English test result','study',7);
