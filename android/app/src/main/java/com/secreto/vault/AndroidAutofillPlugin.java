package com.secreto.vault;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidAutofill")
public class AndroidAutofillPlugin extends Plugin {

    @PluginMethod
    public void setCredentials(PluginCall call) {
        String credentialsJson = call.getString("credentials");
        if (credentialsJson == null) {
            call.reject("Nenhuma credencial fornecida.");
            return;
        }

        try {
            // Salva as credenciais descriptografadas de forma privada no SharedPreferences do app
            SharedPreferences sharedPref = getContext().getSharedPreferences("GKDSecretoAutofill", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = sharedPref.edit();
            editor.putString("credentials_list", credentialsJson);
            editor.apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Falha ao salvar credenciais nativas: " + e.getMessage());
        }
    }
}
