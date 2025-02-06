use actix_web::{get, HttpResponse, Responder};
#[get("/hello-world")]
pub async fn hello_world() -> impl Responder {
    HttpResponse::Ok().body("<h1>Xin chào! Chúng tôi là Vietnamlens!</h1>")
}

// struct Todo{
//     task: String,
// }
// #[get("/todos/list")]
// pub async fn todos_list() -> impl Responder {
//     let todos: Vec<Todo> = vec![
//         Todo{
//             task: "Làm Web Vietnamlens".to_string(),
//         },
//     ];
// } 