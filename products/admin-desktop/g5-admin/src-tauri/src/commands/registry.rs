macro_rules! app_invoke_handler {
    () => {
        crate::commands::registry_groups::all_command_handlers!()
    };
}

pub(crate) use app_invoke_handler;
