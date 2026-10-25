-- For a database that is already set up: Europe (or America) becomes United States everywhere.
-- Jobs follow automatically because they link to the destination row, not its name.
-- Safe to run more than once.
update destinations     set name = 'United States' where name in ('Europe', 'America');
update employers        set country = 'United States' where country in ('Europe', 'America');
update applications     set destination = 'United States' where destination in ('Europe', 'America');
update users            set destination = 'United States' where destination in ('Europe', 'America');
update contact_messages set destination = 'United States' where destination in ('Europe', 'America');
update visa_cases       set destination = 'United States' where destination in ('Europe', 'America');
update content_items    set value = 'United States' where value in ('Europe', 'America');
-- text: "in Europe" reads "in the United States"
update content_items set title = replace(replace(replace(replace(title, 'in Europe', 'in the United States'), 'in America', 'in the United States'), 'Europe', 'United States'), 'America', 'United States') where title ~ '(Europe|America)';
update content_items set body  = replace(replace(replace(replace(body,  'in Europe', 'in the United States'), 'in America', 'in the United States'), 'Europe', 'United States'), 'America', 'United States') where body  ~ '(Europe|America)';
update settings      set value = replace(replace(replace(replace(value, 'in Europe', 'in the United States'), 'in America', 'in the United States'), 'Europe', 'United States'), 'America', 'United States') where value ~ '(Europe|America)';
