package com.secreto.vault;

import android.app.assist.AssistStructure;
import android.app.assist.AssistStructure.ViewNode;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveRequest;
import android.util.Log;
import android.view.View;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class GKDAutofillService extends AutofillService {
    private static final String TAG = "GKDAutofillService";

    @Override
    public void onFillRequest(FillRequest request, CancellationSignal cancellationSignal, FillCallback callback) {
        Log.d(TAG, "onFillRequest disparado pelo sistema");

        // Obter os contextos de preenchimento
        List<FillContext> contexts = request.getFillContexts();
        if (contexts.isEmpty()) {
            callback.onSuccess(null);
            return;
        }

        // Recuperar a estrutura de assistência (a árvore de elementos da tela)
        AssistStructure structure = contexts.get(contexts.size() - 1).getStructure();
        
        // Identificar o aplicativo atual ou site rodando
        String packageName = structure.getActivityComponent().getPackageName();
        Log.d(TAG, "Identificando pacote ativo: " + packageName);

        // Listas para armazenar os campos de login e senha encontrados na tela
        List<AutofillId> usernameFields = new ArrayList<>();
        List<AutofillId> passwordFields = new ArrayList<>();
        ArrayList<String> webDomains = new ArrayList<>();

        // Percorrer a árvore de elementos da tela para identificar os campos e domínios
        findAutofillFields(structure.getWindowNodeAt(0).getRootViewNode(), usernameFields, passwordFields, webDomains);

        if (usernameFields.isEmpty() && passwordFields.isEmpty()) {
            Log.d(TAG, "Nenhum campo de login ou senha reconhecido nesta tela.");
            callback.onSuccess(null);
            return;
        }

        // Descobrir qual o domínio ou termo de busca ideal
        String targetDomain = "";
        if (!webDomains.isEmpty()) {
            targetDomain = webDomains.get(0);
        } else {
            // Se for um aplicativo nativo, usa o nome do pacote (ex: com.instagram.android -> instagram)
            String[] parts = packageName.split("\\.");
            for (String part : parts) {
                if (!part.equals("com") && !part.equals("android") && !part.equals("app") && !part.equals("mobile")) {
                    targetDomain = part;
                    break;
                }
            }
            if (targetDomain.isEmpty()) {
                targetDomain = packageName;
            }
        }

        Log.d(TAG, "Buscando correspondência de credenciais para: " + targetDomain);

        // Ler as credenciais sincronizadas do cofre em SharedPreferences
        SharedPreferences sharedPref = getSharedPreferences("GKDSecretoAutofill", Context.MODE_PRIVATE);
        String credentialsJsonStr = sharedPref.getString("credentials_list", "[]");

        FillResponse.Builder responseBuilder = new FillResponse.Builder();
        boolean hasMatches = false;

        try {
            JSONArray credentialsArray = new JSONArray(credentialsJsonStr);
            for (int i = 0; i < credentialsArray.length(); i++) {
                JSONObject entry = credentialsArray.getJSONObject(i);
                
                String entryTitle = entry.optString("title", "").toLowerCase();
                String entryWebsite = entry.optString("website", "").toLowerCase();
                String usernameValue = entry.optString("username", "");
                String passwordValue = entry.optString("password", "");

                // Se o campo de senha principal estiver vazio, tenta pegar de PIN/Acesso ou Transação
                if (passwordValue.isEmpty()) {
                    passwordValue = entry.optString("accessPassword", "");
                }
                if (passwordValue.isEmpty()) {
                    passwordValue = entry.optString("transactionPassword", "");
                }

                if (usernameValue.isEmpty() || passwordValue.isEmpty()) {
                    continue; // Pula entradas incompletas
                }

                // Critério de correspondência inteligente (domínio de site ou termo de título do app)
                boolean matches = false;
                if (!targetDomain.isEmpty()) {
                    matches = entryWebsite.contains(targetDomain) || 
                              targetDomain.contains(entryWebsite) || 
                              entryTitle.contains(targetDomain) || 
                              targetDomain.contains(entryTitle);
                }

                if (matches) {
                    hasMatches = true;
                    Log.d(TAG, "Correspondência encontrada! Serviço: " + entry.optString("title") + " (" + usernameValue + ")");

                    // Layout para exibir a sugestão na caixinha de Autofill do teclado do celular
                    RemoteViews presentation = new RemoteViews(getPackageName(), R.layout.autofill_suggestion);
                    presentation.setTextViewText(R.id.suggestion_title, entry.optString("title"));
                    presentation.setTextViewText(R.id.suggestion_username, usernameValue);

                    Dataset.Builder datasetBuilder = new Dataset.Builder();

                    // Adicionar preenchimento para todos os campos de usuário encontrados
                    for (AutofillId usernameId : usernameFields) {
                        datasetBuilder.setValue(usernameId, AutofillValue.forText(usernameValue), presentation);
                    }

                    // Adicionar preenchimento para todos os campos de senha encontrados
                    for (AutofillId passwordId : passwordFields) {
                        datasetBuilder.setValue(passwordId, AutofillValue.forText(passwordValue), presentation);
                    }

                    responseBuilder.addDataset(datasetBuilder.build());
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Falha ao processar credenciais e preencher campos", e);
        }

        if (hasMatches) {
            callback.onSuccess(responseBuilder.build());
        } else {
            Log.d(TAG, "Nenhuma credencial correspondente foi encontrada no cofre.");
            callback.onSuccess(null);
        }
    }

    @Override
    public void onSaveRequest(SaveRequest request, SaveCallback callback) {
        // Opcional: Salvar credenciais capturadas na tela de volta pro app (não obrigatório para preenchimento)
        callback.onSuccess();
    }

    // Função recursiva para varrer a tela e descobrir os inputs de usuário e senha
    private void findAutofillFields(ViewNode node, List<AutofillId> usernameFields, List<AutofillId> passwordFields, List<String> webDomains) {
        if (node == null) return;

        // Tentar capturar domínios de sites abertos no Chrome/WebView
        if (node.getWebDomain() != null) {
            webDomains.add(node.getWebDomain());
            Log.d(TAG, "Domínio web detectado no nó: " + node.getWebDomain());
        }

        int inputType = node.getInputType();
        String[] hints = node.getAutofillHints();
        String resourceId = node.getIdEntry();
        String nodeText = node.getText() != null ? node.getText().toString().toLowerCase() : "";
        String hintText = node.getHint() != null ? node.getHint().toLowerCase() : "";

        boolean isPasswordField = false;
        boolean isUsernameField = false;

        // 1. Verificar dicas nativas de Autofill (Hints)
        if (hints != null) {
            for (String hint : hints) {
                if (hint.equalsIgnoreCase(View.AUTOFILL_HINT_PASSWORD)) {
                    isPasswordField = true;
                } else if (hint.equalsIgnoreCase(View.AUTOFILL_HINT_USERNAME) || 
                           hint.equalsIgnoreCase(View.AUTOFILL_HINT_EMAIL_ADDRESS)) {
                    isUsernameField = true;
                }
            }
        }

        // 2. Verificar o tipo de entrada (HTML/Native input type)
        if (!isPasswordField) {
            isPasswordField = (inputType & View.AUTOFILL_TYPE_TEXT) != 0 && 
                              ((inputType & android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD) != 0 || 
                               (inputType & android.text.InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD) != 0);
        }

        // 3. Verificar ID de recurso e textos auxiliares
        if (resourceId != null) {
            resourceId = resourceId.toLowerCase();
            if (resourceId.contains("password") || resourceId.contains("senha")) {
                isPasswordField = true;
            } else if (resourceId.contains("username") || resourceId.contains("email") || resourceId.contains("login") || resourceId.contains("usuario")) {
                isUsernameField = true;
            }
        }

        if (hintText.contains("senha") || hintText.contains("password") || hintText.contains("pass")) {
            isPasswordField = true;
        } else if (hintText.contains("usuario") || hintText.contains("username") || hintText.contains("email") || hintText.contains("login") || hintText.contains("cpf")) {
            isUsernameField = true;
        }

        // Salvar os campos correspondentes
        if (isPasswordField && node.getAutofillId() != null) {
            passwordFields.add(node.getAutofillId());
            Log.d(TAG, "Identificado campo de Senha: " + node.getAutofillId() + " (Hint: " + hintText + ", ID: " + resourceId + ")");
        } else if (isUsernameField && node.getAutofillId() != null) {
            usernameFields.add(node.getAutofillId());
            Log.d(TAG, "Identificado campo de Usuário/Login: " + node.getAutofillId() + " (Hint: " + hintText + ", ID: " + resourceId + ")");
        }

        // Percorrer os nós filhos recursivamente
        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            findAutofillFields(node.getChildAt(i), usernameFields, passwordFields, webDomains);
        }
    }
}
