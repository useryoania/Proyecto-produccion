import React, { useState } from 'react';

const FileUploadForm = () => {
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState(null);

  const handleTextChange = (e) => {
    setTextInput(e.target.value);
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('text', textInput);
    formData.append('file', file);

    try {
      const response = await fetch(`/api/upload?folderName=Archivo/${textInput}`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        alert('File uploaded successfully!');
      } else {
        alert('Failed to upload file.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="textInput">Text Input:</label>
        <input
          type="text"
          id="textInput"
          value={textInput}
          onChange={handleTextChange}
        />
      </div>
      <div>
        <label htmlFor="fileInput">Upload File:</label>
        <input type="file" id="fileInput" onChange={handleFileChange} />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
};

export default FileUploadForm;