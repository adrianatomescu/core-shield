package com.licenta.apicore;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        String parola = "admin";
        String hash = encoder.encode(parola);

        System.out.println("Parola initiala: " + parola);
        System.out.println("Hash: " + hash);
    }
}