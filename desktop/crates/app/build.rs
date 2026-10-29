//! Incorpora icona e metadati di versione nell'eseguibile Windows.
fn main() {
    #[cfg(windows)]
    {
        let mut res = winresource::WindowsResource::new();
        res.set_icon("../../installer/icon.ico")
            .set("ProductName", "Sintropia")
            .set(
                "FileDescription",
                "Sintropia - Cognitive tests Hub (desktop)",
            )
            .set("CompanyName", "Arturo Grant Chiappini")
            .set(
                "LegalCopyright",
                "Copyright (c) Arturo Grant Chiappini - licenza MIT",
            );
        if let Err(err) = res.compile() {
            panic!("impossibile incorporare le risorse Windows: {err}");
        }
    }
    println!("cargo:rerun-if-changed=../../installer/icon.ico");
}
