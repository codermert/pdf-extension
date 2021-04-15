conversionForm.onsubmit = e => {
  e.preventDefault()
  resultFiles.innerHTML = ''
  secretInput.reportValidity()
  fileInput.reportValidity()
  fetch(`https://v2.convertapi.com/convert/docx/to/pdf?Secret=jYzHHfNgDQQAbhsG&StoreFile=true`, {
    method: 'POST',
    body: new FormData(conversionForm)
  }).then(r => r.json())
  .then(o => o.Files.forEach(f => {
      let a = document.createElement('a')
      a.setAttribute('href', f.Url)
      a.innerText = f.Url
      let li = document.createElement('li')
      li.appendChild(a)
      resultFiles.appendChild(li)
    })   
  )
}