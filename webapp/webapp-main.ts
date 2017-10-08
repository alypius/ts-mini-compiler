import { Program } from "ts-mini-compiler";

function showText(divName: string, text: string) {
    const elt = document.getElementById(divName);
    if (elt) elt.innerText = text;
}

export function launch() {
    showText("content", Program.test());
}
