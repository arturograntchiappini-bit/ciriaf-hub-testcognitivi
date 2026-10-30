//! Accesso ai file con limiti di dimensione e scrittura atomica.
use std::fs;
use std::io::{Read, Write};
use std::path::Path;

/// Tetto per i file di configurazione e di protocollo (un file reale pesa pochi KiB).
pub const MAX_CONFIG_BYTES: u64 = 2 * 1024 * 1024;
/// Tetto per risultati e sessioni (migliaia di trial in JSON).
pub const MAX_RESULT_BYTES: u64 = 64 * 1024 * 1024;

/// Legge un file di testo UTF-8 rifiutando quelli oltre `max_bytes`, senza caricarli in memoria.
pub fn read_text_capped(path: &Path, max_bytes: u64) -> Result<String, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut text = String::new();
    file.take(max_bytes + 1)
        .read_to_string(&mut text)
        .map_err(|e| e.to_string())?;
    if text.len() as u64 > max_bytes {
        return Err(format!(
            "il file supera il limite di {} MiB",
            max_bytes / (1024 * 1024)
        ));
    }
    Ok(text)
}

/// Scrive in un file temporaneo accanto alla destinazione e lo rinomina: un crash a metà non lascia file troncati.
pub fn write_atomic(path: &Path, content: &[u8]) -> Result<(), String> {
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = std::path::PathBuf::from(tmp);
    let write = || -> std::io::Result<()> {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(content)?;
        file.sync_all()?;
        fs::rename(&tmp, path)
    };
    write().map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("scrittura {}: {e}", path.display())
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp(name: &str) -> std::path::PathBuf {
        let dir =
            std::env::temp_dir().join(format!("sintropia-fsutil-{}-{name}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn read_rejects_oversized_files() {
        let dir = temp("cap");
        let path = dir.join("a.json");
        fs::write(&path, "x".repeat(100)).unwrap();
        assert_eq!(read_text_capped(&path, 100).unwrap().len(), 100);
        assert!(read_text_capped(&path, 99).unwrap_err().contains("limite"));
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn write_atomic_replaces_and_leaves_no_temp_file() {
        let dir = temp("atomic");
        let path = dir.join("s.json");
        write_atomic(&path, b"uno").unwrap();
        write_atomic(&path, b"due").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "due");
        assert!(!dir.join("s.json.tmp").exists());
        let _ = fs::remove_dir_all(dir);
    }
}
