create table products (
  id serial primary key,
  category text not null check (category in ('running','badminton','tennis','casual')),
  brand text not null default '',
  name text not null,
  description text not null default '',
  image text,
  image_version int not null default 1,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  low_stock_threshold int not null default 2,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table variants (
  id serial primary key,
  product_id int not null references products(id) on delete cascade,
  size text not null,
  stock int not null default 0 check (stock >= 0),
  reserved int not null default 0 check (reserved >= 0),
  unique (product_id, size),
  check (reserved <= stock)
);

create table orders (
  id serial primary key,
  customer_name text not null,
  ig_handle text not null default '',
  product_id int not null references products(id),
  variant_id int not null references variants(id),
  qty int not null check (qty > 0),
  unit_price numeric(12,2) not null default 0,
  status text not null check (status in ('reserved','paid','completed','cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);
create index orders_status_idx on orders(status);
create index orders_created_idx on orders(created_at);

create table stock_movements (
  id serial primary key,
  variant_id int not null references variants(id) on delete cascade,
  delta int not null,
  reason text not null,
  unit_cost numeric(12,2),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index stock_movements_variant_idx on stock_movements(variant_id);

create table ig_posts (
  id serial primary key,
  ig_id text unique,
  caption text not null default '',
  media_url text not null default '',
  permalink text not null default '',
  posted_at timestamptz,
  status text not null default 'new' check (status in ('new','linked','dismissed')),
  product_id int references products(id) on delete set null,
  source text not null default 'manual' check (source in ('graph','sample','manual')),
  created_at timestamptz not null default now()
);
create index ig_posts_status_idx on ig_posts(status);

create table settings (
  key text primary key,
  value text not null
);
