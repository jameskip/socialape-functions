exports.isEmpty = string => string.trim() === '' ? true : false
exports.isValidEmail = email => email.match(/^(([^<>()[\]\\.,;:\s@']+(\.[^<>()[\]\\.,;:\s@']+)*)|('.+'))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/) ? true : false
exports.isValidPassword = password => password.length >= 8

exports.reduceUserDetails = data => {
  const userDetails = {}

  if (!this.isEmpty(data.bio.trim())) userDetails.bio = data.bio.trim()
  if (!this.isEmpty(data.website.trim())) {
    if (data.website.trim().startsWith('http')) {
      userDetails.website = data.website.trim()
    } else {
      userDetails.website = `http://${data.website.trim()}`
    }
  }
  if (!this.isEmpty(data.location.trim())) userDetails.location = data.location.trim()

  return userDetails
}
