REVOKE ALL ON FUNCTION public.create_listing_profile() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.create_listing_profile() TO service_role;
COMMENT ON TABLE public.listing_profiles IS E'@graphql({"omit": true})';
COMMENT ON TABLE public.listing_products IS E'@graphql({"omit": true})';
COMMENT ON TABLE public.listing_variations IS E'@graphql({"omit": true})';
COMMENT ON TABLE public.listing_marketplace_rules IS E'@graphql({"omit": true})';
COMMENT ON TABLE public.intelligent_listings IS E'@graphql({"omit": true})';
COMMENT ON TABLE public.listing_generated_images IS E'@graphql({"omit": true})';
COMMENT ON TABLE public.listing_generation_jobs IS E'@graphql({"omit": true})';