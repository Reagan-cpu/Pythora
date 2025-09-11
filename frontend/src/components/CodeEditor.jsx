import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export default function CodeEditor({
  code,
  setCode,
  disabled,
  onRun,
  onDownload,
  loading,
  locked,
  lang,
  setLang,
  isFullscreen = true,
}) {
  const [showWarning, setShowWarning] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const { theme } = useTheme();

  const lockedRef = useRef(locked);
  const editorRef = useRef(null);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  const showToast = (message) => {
    setShowWarning(message);
    setTimeout(() => setShowWarning(false), 2000);
  };

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;

    // Disable default context menu
    editor.updateOptions({ contextmenu: false });

    // Capture right-click on editor DOM node
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!lockedRef.current) {
          // show custom context menu at mouse position
          setContextMenuPos({ x: e.clientX, y: e.clientY });
          setShowContextMenu(true);
        } else {
          showToast("Right-click is disabled!");
        }
      });
    }

    // Disable clipboard shortcuts
    editor.onKeyDown((e) => {
      if (e.ctrlKey || e.metaKey) {
        if (["KeyV", "KeyC", "KeyX"].includes(e.code)) {
          e.preventDefault();
          showToast("Clipboard actions are disabled!");
        }
      }
    });

    // Register autocomplete suggestions for Python
    monaco.languages.registerCompletionItemProvider("python", {
      provideCompletionItems: () => ({
        suggestions: [
          {
            label: "print",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "print(${1:msg})",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Prints output to the console",
          },
          {
            label: "def",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "def ${1:func_name}(${2:args}):\n    ${3:pass}",
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Define a Python function",
          },
          {
            label: "for loop",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "for ${1:item} in ${2:iterable}:\n    ${3:pass}",
            documentation: "Python for loop",
          },
        ],
      }),
    });

    // Register autocomplete suggestions for C
    monaco.languages.registerCompletionItemProvider("c", {
      provideCompletionItems: () => ({
        suggestions: [
          {
            label: "#include <stdio.h>",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "#include <stdio.h>\n",
            documentation: "Standard I/O library",
          },
          {
            label: "main",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "int main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}",
            documentation: "C main function template",
          },
          {
            label: "printf",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "printf(\"${1:text}\\n\");",
            documentation: "Print text to console",
          },
        ],
      }),
    });
  };

  // Starter templates
  const templates = {
    python: "# Python Hello World\nprint('Hello, World!')\n",
    c: "/* C Hello World */\n#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}\n",
  };

  const switchLanguage = (newLang) => {
    setLang(newLang);
    if (!code.trim()) setCode(templates[newLang]);
  };

  // Handle custom context menu option clicks
  const handleMenuClick = (action) => {
    if (!editorRef.current) return;

    editorRef.current.focus(); // make sure editor has focus

    if (action === "commandPalette") {
      editorRef.current.trigger("keyboard", "editor.action.quickCommand", null);
    }
    if (action === "changeAll") {
      editorRef.current.trigger("keyboard", "editor.action.selectHighlights", null);
    }

    setShowContextMenu(false);
  };

  return (
    <div
      className="h-full flex flex-col bg-white dark:bg-gray-900"
      onClick={() => setShowContextMenu(false)}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2 text-sm">
                {lang === "python" ? "Python" : "C"}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Select Language</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => switchLanguage("python")}>Python</DropdownMenuItem>
              <DropdownMenuItem onClick={() => switchLanguage("c")}>C</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
            {lang === "python" ? "Python Editor" : "C Editor"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-blue-600 dark:text-blue-400">
              <div className="w-3 h-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Running...</span>
            </div>
          )}
          <button
            onClick={onRun}
            disabled={locked || loading || !isFullscreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              locked || loading || !isFullscreen
                ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            }`}
          >
            Run Code
          </button>

          <button
            onClick={onDownload}
            disabled={locked || loading || !isFullscreen}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              locked || loading || !isFullscreen
                ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
            }`}
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language={lang}
          theme={theme === "dark" ? "vs-dark" : "light"}
          value={code}
          onChange={(value) => setCode(value)}
          onMount={handleEditorMount}
          options={{
            readOnly: disabled || locked || !isFullscreen,
            contextmenu: false, // custom menu
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Cascadia Code', 'Fira Code', 'Courier New', monospace",
            wordWrap: "on",
            lineNumbers: "on",
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            parameterHints: { enabled: true },
            tabSize: 4,
            folding: true,
          }}
        />

        {/* Custom Context Menu */}
{showContextMenu && (
  <div
    className="absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg z-50 w-56"
    style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
  >
    <button
      className="block px-4 py-2 w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none text-sm font-sans"
      onClick={() => handleMenuClick("changeAll")}
    >
      Change All Occurrences
    </button>
    <button
      className="block px-4 py-2 w-full text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none text-sm font-sans"
      onClick={() => handleMenuClick("commandPalette")}
    >
      Command Palette
    </button>
  </div>
)}


      </div>

      {/* Warning Toast */}
      {showWarning && (
        <div className="absolute top-16 right-4 bg-orange-500 text-white px-4 py-2 rounded shadow-lg text-sm font-medium z-50">
          ⚠ {showWarning}
        </div>
      )}
    </div>
  );
}
