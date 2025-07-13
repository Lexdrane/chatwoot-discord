/**
 * Handle Axios errors with detailed logging
 * @param {Error} error - The Axios error object
 * @param {string} calledUrl - The URL that was called when the error occurred
 */
function handleAxiosError(error, calledUrl = "N/A") {
  console.error(`[Axios Error] URL: ${calledUrl}`);
  
  if (error.response) {
    // Server responded with error status
    console.error(`[Axios Error] Status: ${error.response.status}`);
    console.error(`[Axios Error] Headers:`, error.response.headers);
    console.error(`[Axios Error] Response Data:`, JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    console.error(`[Axios Error] No response received. Request:`, error.request);
  } else {
    console.error(`[Axios Error] Request setup error:`, error.message);
  }
  
  console.error(`[Axios Error] Full error:`, error);
}

/**
 * Log attachment information for debugging
 * @param {Collection} attachments - Discord message attachments
 * @param {string} username - Username of the sender
 */
function logAttachmentInfo(attachments, username) {
  if (attachments.size > 0) {
    let attachmentInfo = ` (${attachments.size} attachment(s))`;
    attachments.forEach(att => {
      attachmentInfo += `\n  - ${att.name}: ${att.url}`;
    });
    return attachmentInfo;
  }
  return '';
}

/**
 * Truncate string for logging purposes
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
function truncateString(str, length = 100) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

module.exports = {
  handleAxiosError,
  logAttachmentInfo,
  truncateString
};