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
        Log.d(TAG, "onFillRequest disparado");

        List<FillContext> contexts = request.getFillContexts();
        if (contexts.isEmpty()) {
            callback.onSuccess(null);
            return;
        }

        AssistStructure structure = contexts.get(contexts.size() - 1).getStructure();
        String packageName = structure.getActivityComponent().getPackageName();

        // Listas para categorizar os tipos de campos identificados na tela do celular
        List<AutofillId> cpfFields = new ArrayList<>();
        List<AutofillId> nameFields = new ArrayList<>();
        List<AutofillId> phoneFields = new ArrayList<>();
        List<AutofillId> emailFields = new ArrayList<>();
        List<AutofillId> passwordFields = new ArrayList<>();
        List<AutofillId> genericUsernameFields = new ArrayList<>();
        ArrayList<String> webDomains = new ArrayList<>();

        // Varre a tela atual para categorizar os campos
        findAutofillFields(
            structure.getWindowNodeAt(0).getRootViewNode(), 
            cpfFields, 
            nameFields, 
            phoneFields, 
            emailFields, 
            passwordFields, 
            genericUsernameFields, 
            webDomains
        );

        boolean foundAnyField = !cpfFields.isEmpty() || !nameFields.isEmpty() || 
                                !phoneFields.isEmpty() || !emailFields.isEmpty() || 
                                !passwordFields.isEmpty() || !genericUsernameFields.isEmpty();

        if (!foundAnyField) {
            Log.d(TAG, "Nenhum campo compatível identificado nesta tela.");
            callback.onSuccess(null);
            return;
        }

        // Identificar domínio ou aplicativo ativo
        String targetDomain = "";
        if (!webDomains.isEmpty()) {
            targetDomain = webDomains.get(0);
        } else {
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

        // Recuperar credenciais e dados pessoais armazenados
        SharedPreferences sharedPref = getSharedPreferences("GKDSecretoAutofill", Context.MODE_PRIVATE);
        String credentialsJsonStr = sharedPref.getString("credentials_list", "[]");

        FillResponse.Builder responseBuilder = new FillResponse.Builder();
        boolean addedAnyDataset = false;

        try {
            JSONArray credentialsArray = new JSONArray(credentialsJsonStr);

            // 1. PREENCHIMENTO DE CPF / CNPJ (Dados Pessoais)
            if (!cpfFields.isEmpty()) {
                for (int i = 0; i < credentialsArray.length(); i++) {
                    JSONObject entry = credentialsArray.getJSONObject(i);
                    String entryTitle = entry.optString("title", "").toLowerCase();
                    String usernameValue = entry.optString("username", "");

                    if (usernameValue.isEmpty()) continue;

                    // Se for um registro explicitamente rotulado como CPF, CNPJ, Documento ou Perfil
                    boolean isCPFEntry = entryTitle.contains("cpf") || entryTitle.contains("cnpj") || 
                                         entryTitle.contains("documento") || entryTitle.contains("pessoal") || 
                                         entryTitle.contains("perfil") || entryTitle.contains("identidade");

                    if (isCPFEntry) {
                        RemoteViews presentation = new RemoteViews(getPackageName(), R.layout.autofill_suggestion);
                        presentation.setTextViewText(R.id.suggestion_title, entry.optString("title"));
                        presentation.setTextViewText(R.id.suggestion_username, usernameValue);

                        Dataset.Builder datasetBuilder = new Dataset.Builder();
                        for (AutofillId id : cpfFields) {
                            datasetBuilder.setValue(id, AutofillValue.forText(usernameValue), presentation);
                        }
                        responseBuilder.addDataset(datasetBuilder.build());
                        addedAnyDataset = true;
                    }
                }
            }

            // 2. PREENCHIMENTO DE NOME COMPLETO (Dados Pessoais)
            if (!nameFields.isEmpty()) {
                for (int i = 0; i < credentialsArray.length(); i++) {
                    JSONObject entry = credentialsArray.getJSONObject(i);
                    String entryTitle = entry.optString("title", "").toLowerCase();
                    String usernameValue = entry.optString("username", "");

                    if (usernameValue.isEmpty()) continue;

                    boolean isNameEntry = entryTitle.contains("nome") || entryTitle.contains("name") || 
                                          entryTitle.contains("pessoal") || entryTitle.contains("perfil") || 
                                          entryTitle.contains("completo") || entryTitle.contains("identidade");

                    if (isNameEntry) {
                        RemoteViews presentation = new RemoteViews(getPackageName(), R.layout.autofill_suggestion);
                        presentation.setTextViewText(R.id.suggestion_title, entry.optString("title"));
                        presentation.setTextViewText(R.id.suggestion_username, usernameValue);

                        Dataset.Builder datasetBuilder = new Dataset.Builder();
                        for (AutofillId id : nameFields) {
                            datasetBuilder.setValue(id, AutofillValue.forText(usernameValue), presentation);
                        }
                        responseBuilder.addDataset(datasetBuilder.build());
                        addedAnyDataset = true;
                    }
                }
            }

            // 3. PREENCHIMENTO DE TELEFONE / CELULAR (Dados Pessoais)
            if (!phoneFields.isEmpty()) {
                for (int i = 0; i < credentialsArray.length(); i++) {
                    JSONObject entry = credentialsArray.getJSONObject(i);
                    String entryTitle = entry.optString("title", "").toLowerCase();
                    String usernameValue = entry.optString("username", "");

                    if (usernameValue.isEmpty()) continue;

                    boolean isPhoneEntry = entryTitle.contains("tel") || entryTitle.contains("phone") || 
                                           entryTitle.contains("celular") || entryTitle.contains("fone") || 
                                           entryTitle.contains("telefone") || entryTitle.contains("mobile");

                    if (isPhoneEntry) {
                        RemoteViews presentation = new RemoteViews(getPackageName(), R.layout.autofill_suggestion);
                        presentation.setTextViewText(R.id.suggestion_title, entry.optString("title"));
                        presentation.setTextViewText(R.id.suggestion_username, usernameValue);

                        Dataset.Builder datasetBuilder = new Dataset.Builder();
                        for (AutofillId id : phoneFields) {
                            datasetBuilder.setValue(id, AutofillValue.forText(usernameValue), presentation);
                        }
                        responseBuilder.addDataset(datasetBuilder.build());
                        addedAnyDataset = true;
                    }
                }
            }

            // 4. PREENCHIMENTO DE EMAIL (Dados Pessoais)
            if (!emailFields.isEmpty()) {
                for (int i = 0; i < credentialsArray.length(); i++) {
                    JSONObject entry = credentialsArray.getJSONObject(i);
                    String entryTitle = entry.optString("title", "").toLowerCase();
                    String usernameValue = entry.optString("username", "");

                    if (usernameValue.isEmpty()) continue;

                    boolean isEmailEntry = entryTitle.contains("email") || entryTitle.contains("mail") || 
                                           entryTitle.contains("pessoal") || entryTitle.contains("perfil");

                    if (isEmailEntry) {
                        RemoteViews presentation = new RemoteViews(getPackageName(), R.layout.autofill_suggestion);
                        presentation.setTextViewText(R.id.suggestion_title, entry.optString("title"));
                        presentation.setTextViewText(R.id.suggestion_username, usernameValue);

                        Dataset.Builder datasetBuilder = new Dataset.Builder();
                        for (AutofillId id : emailFields) {
                            datasetBuilder.setValue(id, AutofillValue.forText(usernameValue), presentation);
                        }
                        responseBuilder.addDataset(datasetBuilder.build());
                        addedAnyDataset = true;
                    }
                }
            }

            // 5. PREENCHIMENTO DE LOGIN PADRÃO (Usuário/Senha vinculados a sites)
            ArrayList<JSONObject> matchingEntries = new ArrayList<>();
            ArrayList<JSONObject> fallbackEntries = new ArrayList<>();

            for (int i = 0; i < credentialsArray.length(); i++) {
                JSONObject entry = credentialsArray.getJSONObject(i);
                String entryTitle = entry.optString("title", "").toLowerCase();
                String entryWebsite = entry.optString("website", "").toLowerCase();
                String usernameValue = entry.optString("username", "");
                String passwordValue = entry.optString("password", "");

                if (passwordValue.isEmpty()) passwordValue = entry.optString("accessPassword", "");
                if (passwordValue.isEmpty()) passwordValue = entry.optString("transactionPassword", "");

                if (usernameValue.isEmpty() || passwordValue.isEmpty()) continue;

                boolean matches = false;
                if (!targetDomain.isEmpty()) {
                    matches = entryWebsite.contains(targetDomain) || 
                              targetDomain.contains(entryWebsite) || 
                              entryTitle.contains(targetDomain) || 
                              targetDomain.contains(entryTitle);
                }

                if (matches) {
                    matchingEntries.add(entry);
                } else if (fallbackEntries.size() < 3) {
                    fallbackEntries.add(entry);
                }
            }

            List<JSONObject> loginEntriesToUse = matchingEntries;
            if (loginEntriesToUse.isEmpty() && !addedAnyDataset) {
                // Caso não tenhamos preenchido nenhum dado pessoal e não achamos site exato, usa o plano B
                loginEntriesToUse = fallbackEntries;
                Log.d(TAG, "Exibindo credenciais de plano B (fallback).");
            }

            for (JSONObject entry : loginEntriesToUse) {
                String usernameValue = entry.optString("username", "");
                String passwordValue = entry.optString("password", "");
                if (passwordValue.isEmpty()) passwordValue = entry.optString("accessPassword", "");
                if (passwordValue.isEmpty()) passwordValue = entry.optString("transactionPassword", "");

                RemoteViews presentation = new RemoteViews(getPackageName(), R.layout.autofill_suggestion);
                presentation.setTextViewText(R.id.suggestion_title, entry.optString("title"));
                presentation.setTextViewText(R.id.suggestion_username, usernameValue);

                Dataset.Builder datasetBuilder = new Dataset.Builder();

                // Preencher campos de usuário/login normais identificados na tela
                for (AutofillId id : genericUsernameFields) {
                    datasetBuilder.setValue(id, AutofillValue.forText(usernameValue), presentation);
                }
                // Preencher campos de email também se for o único campo de usuário disponível
                for (AutofillId id : emailFields) {
                    datasetBuilder.setValue(id, AutofillValue.forText(usernameValue), presentation);
                }
                // Preencher campo de senha
                for (AutofillId id : passwordFields) {
                    datasetBuilder.setValue(id, AutofillValue.forText(passwordValue), presentation);
                }

                responseBuilder.addDataset(datasetBuilder.build());
                addedAnyDataset = true;
            }

            if (addedAnyDataset) {
                callback.onSuccess(responseBuilder.build());
                return;
            }

        } catch (Exception e) {
            Log.e(TAG, "Falha ao analisar credenciais", e);
        }

        Log.d(TAG, "Nenhuma sugestão enviada.");
        callback.onSuccess(null);
    }

    @Override
    public void onSaveRequest(SaveRequest request, SaveCallback callback) {
        callback.onSuccess();
    }

    private void findAutofillFields(
        ViewNode node, 
        List<AutofillId> cpfFields,
        List<AutofillId> nameFields,
        List<AutofillId> phoneFields,
        List<AutofillId> emailFields,
        List<AutofillId> passwordFields,
        List<AutofillId> genericUsernameFields,
        List<String> webDomains
    ) {
        if (node == null) return;

        if (node.getWebDomain() != null) {
            webDomains.add(node.getWebDomain());
        }

        int inputType = node.getInputType();
        String[] hints = node.getAutofillHints();
        String resourceId = node.getIdEntry() != null ? node.getIdEntry().toLowerCase() : "";
        String hintText = node.getHint() != null ? node.getHint().toLowerCase() : "";
        AutofillId autofillId = node.getAutofillId();

        if (autofillId == null) {
            int childCount = node.getChildCount();
            for (int i = 0; i < childCount; i++) {
                findAutofillFields(node.getChildAt(i), cpfFields, nameFields, phoneFields, emailFields, passwordFields, genericUsernameFields, webDomains);
            }
            return;
        }

        boolean isPassword = false;
        if (hints != null) {
            for (String hint : hints) {
                if (hint.equalsIgnoreCase(View.AUTOFILL_HINT_PASSWORD)) {
                    isPassword = true;
                }
            }
        }
        if (!isPassword) {
            isPassword = (inputType & View.AUTOFILL_TYPE_TEXT) != 0 && 
                         ((inputType & android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD) != 0 || 
                          (inputType & android.text.InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD) != 0);
        }
        if (!isPassword && (resourceId.contains("password") || resourceId.contains("senha") || hintText.contains("senha") || hintText.contains("password") || hintText.contains("pass"))) {
            isPassword = true;
        }

        if (isPassword) {
            passwordFields.add(autofillId);
        } else if (resourceId.contains("cpf") || resourceId.contains("cnpj") || hintText.contains("cpf") || hintText.contains("cnpj") || hintText.contains("documento") || hintText.contains("doc")) {
            cpfFields.add(autofillId);
        } else if (resourceId.contains("phone") || resourceId.contains("tel") || resourceId.contains("celular") || resourceId.contains("fone") || resourceId.contains("telefone") || resourceId.contains("mobile") || hintText.contains("phone") || hintText.contains("tel") || hintText.contains("celular") || hintText.contains("fone") || hintText.contains("telefone") || hintText.contains("mobile")) {
            phoneFields.add(autofillId);
        } else if (resourceId.contains("email") || resourceId.contains("mail") || hintText.contains("email") || hintText.contains("mail") || hintText.contains("correio")) {
            emailFields.add(autofillId);
        } else if (resourceId.contains("nome") || resourceId.contains("name") || resourceId.contains("completo") || resourceId.contains("fullname") || hintText.contains("nome") || hintText.contains("name") || hintText.contains("completo") || hintText.contains("fullname")) {
            nameFields.add(autofillId);
        } else if (resourceId.contains("username") || resourceId.contains("login") || resourceId.contains("usuario") || hintText.contains("username") || hintText.contains("login") || hintText.contains("usuario")) {
            genericUsernameFields.add(autofillId);
        }

        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            findAutofillFields(node.getChildAt(i), cpfFields, nameFields, phoneFields, emailFields, passwordFields, genericUsernameFields, webDomains);
        }
    }
}
