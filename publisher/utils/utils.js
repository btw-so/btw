const {DOMAIN_QUERY_PARAM, IS_DEBUG, IS_HTTPS_DOMAIN, ROOT_DOMAIN, UMAMI_SOURCE} = require('../constants/env')

const {DEFAULT_IMG} = require('../constants/index')

const getDomain = (https) => {
	return `http${https ? 's' : ''}://`
}

const mainUrl = (res) => {
	const {domainSlug, customDomain} = res.locals

	let domain = getDomain(IS_HTTPS_DOMAIN)

	if (customDomain) {
		domain += domainSlug
	} else if (IS_DEBUG) {
		domain += ROOT_DOMAIN.concat('/?', DOMAIN_QUERY_PARAM, '=', domainSlug)
	} else {
		domain += domainSlug.concat('.', ROOT_DOMAIN)
	}

	return domain
}

const createSubUrlWithPath = (res, path) => {
	const {domainSlug, customDomain} = res.locals
	const domain = getDomain(IS_HTTPS_DOMAIN)

	const domainAndSlug = domain.concat(domainSlug)

	if (customDomain) {
		return domainAndSlug.concat(path)
	}

	if (IS_DEBUG) {
		return domain.concat(ROOT_DOMAIN, path, '?', DOMAIN_QUERY_PARAM, '=', domainSlug)
	}

	return domainAndSlug.concat('.', ROOT_DOMAIN, path)
}

const getCommonDeets = (req, res, path, user, {meta_title, meta_description, meta_image, title} = {}) => {
	const {customDomain} = res.locals
	const {
		linkedin, twitter, instagram, umami_site_id, name, email, pic,
	} = user
	const nameOrEmail = name || email
	const newTitle = title ? `${title} | ${nameOrEmail}` : nameOrEmail
	const site_logo = pic || DEFAULT_IMG

	const site_image = meta_image || pic
	const site_title = meta_title ? `${meta_title} | ${nameOrEmail}` : nameOrEmail
	const site_description = meta_description || `${nameOrEmail}`

	return {
		site_url: mainUrl(res),
		originalUrl: createSubUrlWithPath(res, path),
		canonicalUrl: createSubUrlWithPath(res, path),
		aboutUrl: createSubUrlWithPath(res, '/about'),
		site_title,
		site_image,
		site_logo,
		title: newTitle,
		siteTitle: nameOrEmail,
		site_description,
		customDomain,
		linkedin,
		twitter,
		instagram,
		umami_site_id,
		umami_src: UMAMI_SOURCE,
	}
}

module.exports = {mainUrl, createSubUrlWithPath, getCommonDeets}


