-- Per-category default sizes turned out to be unnecessary.
alter table categories drop column default_sizes;
