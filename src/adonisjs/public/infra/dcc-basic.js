(function () {
  DCC.component(
    'submit-login',
    'dcc-submit',
    {
      pos: function (response) {
        console.log(response['harena-login']['response'])
        if(response['harena-login']['response'] === 'Login successful'){
          // console.log('login successful');
          if(document.querySelector('#login-message-alert')){
            document.querySelector('#login-message-alert').innerHTML = response['harena-login']['response']
            document.querySelector('#login-message-alert').classList.add('alert-success')
            document.querySelector('#login-message-alert').classList.remove('alert-danger')

          }
          const promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve(window.location.href = '/'), 1000)
          })
        }else if (response['harena-login']['response'] === 'Email or password incorrect'){
          // console.log('login failed, password or email incorrect');
          if(document.querySelector('#login-message-alert')){
            document.querySelector('#login-message-alert').innerHTML = response['harena-login']['response']
            document.querySelector('#login-message-alert').classList.add('alert-danger')
            document.querySelector('#login-message-alert').classList.remove('alert-success')

          }
        }
      }
    }
  )
  DCC.component(
    'submit-logout',
    'dcc-submit',
    {
      pos: function (response) {
        console.log(response)
        window.location.href = '/'
      }
    }
  )

  DCC.component(
    'submit-change-password',
    'dcc-submit',
    {
      pos: async function (response) {
        console.log(response['harena-change-password'])
        const responseContainer = document.querySelector('#updatePasswordResponse')
        responseContainer.innerHTML = response['harena-change-password']
        if(response['harena-change-password'] === 'Password changed successfully.'){
          console.log('if')
          responseContainer.classList.remove('text-danger')
          responseContainer.classList.add('text-success')
          const promise = new Promise((resolve, reject) => {
            setTimeout(() => resolve(window.location.href = '/'), 1000)
          })
        }else {
          console.log('else')
          responseContainer.classList.remove('text-success')
          responseContainer.classList.add('text-danger')
        }
      }
    }
  )
})()
