// Only reuse a snapshot from the same storefront. A new market must fetch its own data.
export async function withStoreFallback(config, platform, old, refresh, warn) {
  try { return {store:await refresh(), refreshed:true}; }
  catch(error) {
    warn(config.slug,`${platform} metadata; keeping last successful snapshot`,error);
    if(!old || old.country!==config.country)throw new Error(`No fallback for ${config.slug}/${platform}`,{cause:error});
    return {store:old,refreshed:false};
  }
}
