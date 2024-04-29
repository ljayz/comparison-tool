start transaction;

CREATE TABLE comparison (
    id bigint NOT NULL,
    site character varying NOT NULL,
    name character varying NOT NULL,
    itemid numeric NOT NULL,
    shopid numeric NOT NULL,
    brand character varying,
    rating numeric,
    sold character varying,
    price numeric NOT NULL,
    review character varying,
    stock character varying,
    location character varying,
    image character varying,
    images json,
    comparisonid bigint null,
    sort timestamp without time zone,
    createdat timestamp without time zone NOT NULL,
    updatedat timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE comparison_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE ONLY comparison ALTER COLUMN id SET DEFAULT nextval('comparison_id_seq'::regclass);
ALTER TABLE ONLY comparison ADD CONSTRAINT comparison_id_pk PRIMARY KEY (id);
CREATE INDEX comparison_itemid_idx ON comparison USING btree (itemid);
CREATE INDEX comparison_itemid_site_idx ON comparison USING btree (itemid, site);
CREATE INDEX comparison_id_comparisonid_idx ON comparison USING btree (id, comparisonid);
CREATE INDEX comparison_site_idx ON comparison USING btree (site);
CREATE INDEX comparison_name_idx ON comparison USING btree (name);

CREATE TABLE comparison_config (
    key character varying NOT NULL,
    value text
);
ALTER TABLE ONLY comparison_config
    ADD CONSTRAINT comparison_config_pk PRIMARY KEY (key);
INSERT INTO comparison_config VALUES ('sortStatus', 'free'), ('about', '');

commit;
rollback;
