use actix_files as fs;
use actix_web::{App, HttpServer};
mod routers;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(move || {
        // use actix_files to serve static files
        App::new().service(routers::hello_world)
        .service(fs::Files::new("/", "static").index_file("index.html"))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}