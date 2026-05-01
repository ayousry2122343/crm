-- Postgres FTS over People: tsvector column + GIN index + trigger maintains it
ALTER TABLE "Person" ADD COLUMN "search_tsv" tsvector;
CREATE INDEX idx_person_search ON "Person" USING GIN (search_tsv);

CREATE OR REPLACE FUNCTION person_search_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW."fullName",''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW."email",''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW."phone",''))), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW."customFields"::text,'')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER person_search_tsv_trg BEFORE INSERT OR UPDATE ON "Person"
  FOR EACH ROW EXECUTE FUNCTION person_search_tsv_update();

-- Backfill existing rows (touches updatedAt only via the BEFORE trigger).
UPDATE "Person" SET "fullName" = "fullName";
