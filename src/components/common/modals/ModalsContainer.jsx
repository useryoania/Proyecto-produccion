import React from 'react';

const ModalsContainer = ({ modals }) => {
  return (
    <div>
      {modals?.length ? (
        modals.map((modal, i) => <div key={i}>Modal {i}</div>)
      ) : (
        <div>No hay modales</div>
      )}
    </div>
  );
};

export default ModalsContainer;
