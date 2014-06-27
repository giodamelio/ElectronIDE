var editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.getSession().setMode("ace/mode/c_cpp");
editor.setValue(
    "#include <iostream.h>\n\n" + 
    "void main() {\n" +
    "   cout << \"Hello World!\";\n" +
    "}\n"
);

