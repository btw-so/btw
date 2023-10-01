const IS_HTTPS_DOMAIN = Boolean(Number(process.env.HTTPS_DOMAIN))
const ROOT_DOMAIN = process.env.ROOT_DOMAIN || ''
const IS_DEBUG = Boolean(Number(process.env.DEBUG))
const DOMAIN_QUERY_PARAM = process.env.DOMAIN_QUERY_PARAM || ''
const UMAMI_SOURCE = process.env.UMAMI_SOURCE || ''

module.exports = {
	IS_HTTPS_DOMAIN, ROOT_DOMAIN, IS_DEBUG, DOMAIN_QUERY_PARAM, UMAMI_SOURCE,
}

