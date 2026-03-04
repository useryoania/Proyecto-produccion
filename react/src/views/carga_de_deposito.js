import React, { useState, useEffect } from 'react';
import '../aspecto/carga_de_deposito.css';

const CargaDeDeposito = () => {
    const [currentInputIndex, setCurrentInputIndex] = useState(0);
    const [codes, setCodes] = useState([]);
    const [errorMessages, setErrorMessages] = useState([]);

    useEffect(() => {
        createNextInput();
    }, []);

    useEffect(() => {
        const nextInput = document.querySelector(`[data-index='${currentInputIndex - 1}']`);
        if (nextInput) {
            nextInput.focus();
        }
    }, [currentInputIndex]);

    const createNextInput = () => {
        setCodes([...codes, { value: '', index: currentInputIndex }]);
        setCurrentInputIndex(currentInputIndex + 1);
    };

    const handleInput = (index, value, fromPaste = false) => {
        const trimmedValue = value.trim();
    
        // Usar el array actualizado para verificar duplicados
        if (codes.some((code) => code.value === trimmedValue)) {
            setErrorMessages([`El código ${trimmedValue} ya fue ingresado.`]);
            return;
        }
    
        const updatedCodes = [...codes];
        updatedCodes[index].value = trimmedValue;
    
        setErrorMessages([]);
        setCodes(updatedCodes);
    
        if (trimmedValue !== '' && !fromPaste) {
            setTimeout(() => {
                createNextInput();
            }, 500);
        }
    };
    
    const handlePaste = (event, index) => {
        event.preventDefault();
        const pastedText = event.clipboardData.getData('text');
        handleInput(index, pastedText, true);
    };

    const handleKeyDown = (event, index) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            focusNextInput(index);
        }
    };

    const focusNextInput = (index) => {
        const nextInput = document.querySelector(`[data-index='${index + 1}']`);
        if (nextInput) {
            nextInput.focus();
        }
    };

    const processCodes = async () => {
        const newCodes = [];
        setErrorMessages([]); // Restablecer los mensajes de error antes de cada carga
    
        // Filtrar códigos no vacíos
        codes.forEach(({ value }) => {
            const code = value.trim();
            if (code) {
                newCodes.push(code);
            }
        });
    
        const token = localStorage.getItem('token');
        if (newCodes.length === 0) {
            setErrorMessages(['No se han ingresado códigos válidos.']);
            return;
        }
    
        const errors = []; // Array para almacenar errores específicos
        const infos = []; // Array para mensajes informativos (p. ej., código 202)
    
        try {
            // Realizar todas las solicitudes en paralelo
            const responses = await Promise.all(
                newCodes.map((code) =>
                    fetch(`${process.env.REACT_APP_BACKEND_URL}/apiordenes/data`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`, // Agregar token aquí
                        },
                        body: JSON.stringify({ ordenString: code, estado: 'Ingresado' }),
                    }).then((response) => ({
                        code,
                        response,
                    })) // Agregar el código en la respuesta para identificar el resultado
                )
            );
    
            // Procesar las respuestas
            responses.forEach(({ code, response }) => {
                if (!response.ok) {
                    if (response.status === 400) {
                        errors.push(`La orden ${code} ya fue ingresada.`);
                    } else if (response.status === 403) {
                        errors.push(`No se pudo cargar la orden ${code}, el campo cliente esta vacio en la etiqueta.`);                    
                    } else if (response.status === 404) {
                        errors.push(`No se pudo cargar la orden ${code}, cliente no encontrado.`);
                    } else if (response.status === 405) {
                        errors.push(`No se pudo cargar la orden ${code}, producto no encontrado.`);                    
                    } else if (response.status === 500) {
                        errors.push(`No se pudo cargar la orden ${code}, intente de nuevo o consulte con el administrador del sitio.`);
                    } else {
                        errors.push(`Error inesperado con la orden ${code}. Por favor, intenta más tarde.`);
                    }
                } else if (response.status === 202) {
                    infos.push(`La orden ${code} ya había sido creada pero no se encontraba en el depósito. Se procedió a ingresarla nuevamente.`);
                } else {
                    console.log(`Orden ${code} guardada correctamente`);
                }
            });
    
            // Mostrar mensajes de error e información
            if (errors.length > 0 || infos.length > 0) {
                setErrorMessages([...errors, ...infos]);
            } else {
                resetInputs();
                window.location.reload();
            }
        } catch (error) {
            setErrorMessages([`Ocurrió un error general: ${error.message}`]);
        }
    };
    

    const resetInputs = () => {
        setCodes([]);
        setCurrentInputIndex(0);
        createNextInput();
    };

    return (
        <div className="container">
            <h1>Carga de Códigos</h1>
            <div className="code-inputs" id="codeInputs">
                {codes.map((code, index) => (
                    <input
                        key={index}
                        id={`input-${index}`}
                        type="text"
                        className="code-input"
                        placeholder={`Código ${index + 1}`}
                        data-index={index}
                        value={code.value}
                        onInput={(e) => handleInput(index, e.target.value)}
                        onPaste={(e) => handlePaste(e, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                    />
                ))}
            </div>
            <button id="loadButton" onClick={processCodes}>Cargar</button>
            {errorMessages.length > 0 && (
                <div id="errorMessage" className="message">
                    {errorMessages.map((msg, index) => (
                        <div key={index}>{msg}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CargaDeDeposito;
