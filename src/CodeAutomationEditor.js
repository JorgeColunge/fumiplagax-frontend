import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Spinner, Alert, ButtonGroup } from "react-bootstrap";
import axios from "axios";
import Editor from "@monaco-editor/react";

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

const CodeAutomationEditor = () => {
    const query = useQuery();
    const navigate = useNavigate();
    const configId = query.get("configId");

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    /* referencia para disparar acciones del editor (formateo, etc.) */
    const editorRef = useRef(null);

    /* ─────────────────── CARGAR CÓDIGO ─────────────────── */
    useEffect(() => {
        if (!configId) {
            setError("No se proporcionó 'configId' en la URL");
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const { data } = await axios.get(
                    `${process.env.REACT_APP_API_URL}/api/get-configuration/${configId}`
                );
                setCode(data.generated_code || "");
            } catch (err) {
                console.error(err);
                setError("No se pudo obtener la configuración");
            } finally {
                setLoading(false);
            }
        })();
    }, [configId]);

    /* ─────────────────── GUARDAR ─────────────────── */
    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(
                `${process.env.REACT_APP_API_URL}/api/update-code/${configId}`,
                { generated_code: code }
            );
            alert("Código actualizado con éxito");
            navigate(-1);
        } catch (err) {
            console.error(err);
            alert("Error guardando el código");
        } finally {
            setSaving(false);
        }
    };

    /* ─────────────────── FORMATEAR ─────────────────── */
    const formatDocument = () => {
        if (!editorRef.current) return;
        editorRef.current.getAction("editor.action.formatDocument").run();
    };

    /* ─────────────────── MONACO DID MOUNT ─────────────────── */
    const handleEditorDidMount = (editor /*, monaco*/) => {
        editorRef.current = editor;
    };

    /* ─────────────────── RENDER ─────────────────── */
    if (loading) return <Spinner animation="border" />;

    if (error) return <Alert variant="danger">{error}</Alert>;

    return (
        <div className="container mt-4">
            <h4>Editor de Código – Configuración #{configId}</h4>

            <Editor
                height="70vh"
                defaultLanguage="javascript"
                value={code}
                onChange={(value) => setCode(value)}
                onMount={handleEditorDidMount}
                options={{
                    fontSize: 14,
                    minimap: { enabled: true },
                    formatOnPaste: true,
                    formatOnType: true,
                    automaticLayout: true,
                    wordWrap: "on",
                    tabSize: 2,
                }}
            />

            {/* Barra de acciones */}
            <div className="d-flex justify-content-end  mt-3">
                <Button variant="outline-success me-2" onClick={formatDocument}>
                    Formatear
                </Button>
                <Button variant="dark me-2" onClick={() => navigate(-1)}>
                    Cancelar
                </Button>
                <Button variant="success" onClick={handleSave} disabled={saving}>
                    {saving ? "Guardando…" : "Guardar Cambios"}
                </Button>
            </div>
        </div>
    );
};

export default CodeAutomationEditor;
