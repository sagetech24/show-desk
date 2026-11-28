-- Categories become a real table, linked to products many-to-many.
-- A product can sit in several categories (e.g. running + casual) and a category holds many products.

create table categories (
  id serial primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  color text not null default 'slate',
  default_sizes text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index categories_name_key on categories (lower(name));

create table product_categories (
  product_id int not null references products(id) on delete cascade,
  category_id int not null references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);
create index product_categories_category_idx on product_categories (category_id);

insert into categories (slug, name, color, default_sizes, sort_order) values
  ('running',   'Running',   'sky',     '{7,8,9,10,11,12}', 1),
  ('badminton', 'Badminton', 'emerald', '{6,7,8,9,10,11}',  2),
  ('tennis',    'Tennis',    'amber',   '{7,8,9,10,11,12}', 3),
  ('casual',    'Casual',    'violet',  '{6,7,8,9,10,11}',  4);

-- Carry existing single-category products over to the join table.
insert into product_categories (product_id, category_id)
select p.id, c.id from products p join categories c on c.slug = p.category;

alter table products drop column category;
