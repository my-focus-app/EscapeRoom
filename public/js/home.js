const fileInput = document.querySelector('input[name="avatarFile"]');
const avatarPreview = document.getElementById('avatarPreview');

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      avatarPreview.style.backgroundImage = `url('${reader.result}')`;
      avatarPreview.style.backgroundSize = 'cover';
      avatarPreview.style.backgroundPosition = 'center';
    };
    reader.readAsDataURL(file);
  } else {
    avatarPreview.style.background = '#ccc';
  }
});

const form = document.getElementById('teamForm');

form.onsubmit = async e => {
  e.preventDefault();
  const formData = new FormData(form);

  if (!fileInput.files.length) {
    alert("Veuillez uploader une image.");
    return;
  }

  const res = await fetch('/set-team', {
    method: 'POST',
    body: formData,
    credentials: 'same-origin'
  });

  if (res.ok) {
    window.location.href = '/waiting';
  } else {
    alert("Erreur lors de la création du groupe.");
  }
};