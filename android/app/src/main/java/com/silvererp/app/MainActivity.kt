package com.silvererp.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private var fileCallback: ValueCallback<Array<android.net.Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        val webView = findViewById<WebView>(R.id.erpWebView)
        webView.setBackgroundColor(Color.rgb(14, 16, 21))
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            allowFileAccess = false
            allowContentAccess = true
        }
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<android.net.Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    startActivityForResult(params.createIntent(), FILE_PICKER_REQUEST)
                    true
                } catch (_: Exception) {
                    fileCallback = null
                    false
                }
            }
        }
        if (AppConfig.ERP_URL.contains("YOUR-HOSTED")) {
            webView.loadDataWithBaseURL(null, setupMessage, "text/html", "UTF-8", null)
        } else webView.loadUrl(AppConfig.ERP_URL)
    }

    @Deprecated("Used for Android WebView file upload callback")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_PICKER_REQUEST) {
            val result = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            fileCallback?.onReceiveValue(result)
            fileCallback = null
        }
    }

    override fun onBackPressed() {
        val webView = findViewById<WebView>(R.id.erpWebView)
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    companion object {
        private const val FILE_PICKER_REQUEST = 810
        private const val setupMessage = """<!doctype html><html><body style='margin:0;background:#0e1015;color:#f0f2f5;font-family:sans-serif;padding:32px'><h1 style='color:#f2ce79'>Silver ERP</h1><p>Website host panna apram Android app connected aagum.</p><p><b>AppConfig.kt</b>-la hosted HTTPS URL paste pannunga.</p></body></html>"""
    }
}
