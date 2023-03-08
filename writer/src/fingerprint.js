import md5 from './md5';

var SEP = '|';
var ua = window.navigator.userAgent.toLowerCase();
var opera = ua.indexOf('opera') >= 0 || ua.indexOf('opr') >= 0;
var ie = ua.indexOf('msie') >= 0 && !opera;

/**
 *
 */
function activeXDetect(componentClassID) {
  var e,
    obj = document.createElement('div'),
    verIEfull = null; // Full IE version [string/null]

  try {
    obj.style.behavior = 'url(#default#clientcaps)';
    verIEfull = obj
      .getComponentVersion('{' + componentClassID + '}', 'componentid')
      .replace(/,/g, '.');
  } catch (e) {}

  return verIEfull;
}

/**
 * Remove illegal characters from a string
 *
 * @return string
 */
function stripIllegalChars(value) {
  return value.replace(/[\n\/\\]/g, '');
}

/**
 * Get filename from a full path string.
 *
 * @return string
 */
function baseName(tempFileName) {
  return tempFileName.replace(/.*[\/\\]/g, '');
}

/**
 * Get the plugins information.
 *
 * @return string
 */
function fingerprint_software() {
  var t = '';
  var isFirst = true;

  if (window.navigator.plugins.length > 0) {
    for (var i = 0; i < window.navigator.plugins.length; i++) {
      var plugin = window.navigator.plugins[i];
      if (isFirst == true) {
        t += baseName(plugin.filename);
        isFirst = false;
      } else {
        t += SEP + baseName(plugin.filename);
      }
    }
  } else if (window.navigator.mimeTypes.length > 0) {
    for (var i = 0; i < window.navigator.mimeTypes.length; i++) {
      var mimeType = window.navigator.mimeTypes[i];
      if (isFirst == true) {
        t += mimeType.type;
        isFirst = false;
      } else {
        t += SEP + mimeType.type;
      }
    }
  } else if (ie) {
    var components = new Array(
      '7790769C-0471-11D2-AF11-00C04FA35D02',
      '89820200-ECBD-11CF-8B85-00AA005B4340',
      '283807B5-2C60-11D0-A31D-00AA00B92C03',
      '4F216970-C90C-11D1-B5C7-0000F8051515',
      '44BBA848-CC51-11CF-AAFA-00AA00B6015C',
      '9381D8F2-0288-11D0-9501-00AA00B911A5',
      '4F216970-C90C-11D1-B5C7-0000F8051515',
      '5A8D6EE0-3E18-11D0-821E-444553540000',
      '89820200-ECBD-11CF-8B85-00AA005B4383',
      '08B0E5C0-4FCB-11CF-AAA5-00401C608555',
      '45EA75A0-A269-11D1-B5BF-0000F8051515',
      'DE5AED00-A4BF-11D1-9948-00C04F98BBC9',
      '22D6F312-B0F6-11D0-94AB-0080C74C7E95',
      '44BBA842-CC51-11CF-AAFA-00AA00B6015B',
      '3AF36230-A269-11D1-B5BF-0000F8051515',
      '44BBA840-CC51-11CF-AAFA-00AA00B6015C',
      'CC2A9BA0-3BDD-11D0-821E-444553540000',
      '08B0E5C0-4FCB-11CF-AAA5-00401C608500',
      'D27CDB6E-AE6D-11CF-96B8-444553540000',
      '2A202491-F00D-11CF-87CC-0020AFEECF20',
    );
    for (var i = 0; i < components.length; i++) {
      ver = activeXDetect(components[i]);

      if (ver !== null) {
        if (isFirst == true) {
          t += ver;
          isFirst = false;
        } else {
          t += SEP + ver;
        }
      } else {
        t += SEP + 'null';
      }
    }
  }

  return t;
}

/**
 * Get the final browser fingerprint (as hash, eventually).
 *
 * @params boolean hash Flag to make a message digest of the fingerprint
 *
 * @return string
 */
function get_fingerprint(hash) {
  var data = new Array(
    window.navigator.userAgent.toLowerCase(), // User Agent Information
    [screen.width, screen.height, screen.colorDepth].join(SEP), // Screen Information
    new Date().getTimezoneOffset(), // Time Zone Information
    !!window.sessionStorage, // Session Storage Information
    !!window.localStorage, // Local Storage Information
    window.navigator.platform, // Operative System Information
    navigator.cookieEnabled, // Cookie Enabled Information
    navigator.javaEnabled(), // Java Enabled Information
    navigator.language, // Language Information
    fingerprint_software(), // Plugins Information
  );

  fingerprint = data.join('');
  if (hash) {
    fingerprint = '';
    for (idx in data) {
      fingerprint += md5(data[idx].toString().toLowerCase());
    }
  }

  return fingerprint;
}

function get_map(fingerprint) {
  return fingerprint
    .replace(/[0-9]/g, '.')
    .replace(/[a-f]/g, '+')
    .replace(/\.\./g, ':')
    .replace(/\+\+/g, '#')
    .replace(/##/g, '@')
    .replace(/::/g, '~');
}

function final_fingerprint() {
  fingerprint = get_fingerprint(true);
  fingerprint_hash = md5(fingerprint);

  var map = get_map(fingerprint);
  var map_hash = md5(map);
  return fingerprint_hash + map_hash;
}

export default final_fingerprint;
