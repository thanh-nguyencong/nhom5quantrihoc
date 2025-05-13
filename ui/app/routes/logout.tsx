export default function Logout() {
    localStorage.removeItem("jwt")
    window.open("/", "_self")!.focus()
    return <></>
}