package com.licenta.apicore.controller;

import com.licenta.apicore.dto.LoginRequest;
import com.licenta.apicore.model.User;
import com.licenta.apicore.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            User user = userService.login(
                    request.getEmail(),
                    request.getPassword(),
                    request.getRole()
            );

            return ResponseEntity.ok("Login successful for: " + user.getEmail());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}