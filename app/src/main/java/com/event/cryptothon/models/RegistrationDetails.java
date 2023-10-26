package com.event.cryptothon.models;

public class RegistrationDetails {
    private boolean wrongTeamCode;
    private boolean registeredSuccessfully;

    public String getDeviceId1() {
        return deviceId1;
    }

    public void setDeviceId1(String deviceId1) {
        this.deviceId1 = deviceId1;
    }

    public String getDeviceId2() {
        return deviceId2;
    }

    public void setDeviceId2(String deviceId2) {
        this.deviceId2 = deviceId2;
    }

    public String getDeviceId3() {
        return deviceId3;
    }

    public void setDeviceId3(String deviceId3) {
        this.deviceId3 = deviceId3;
    }

    private String deviceId1;
    private String deviceId2;
    private String deviceId3;

    public boolean isWrongTeamCode() {
        return wrongTeamCode;
    }

    public void setWrongTeamCode(boolean wrongTeamCode) {
        this.wrongTeamCode = wrongTeamCode;
    }

    public boolean isRegisteredSuccessfully() {
        return registeredSuccessfully;
    }

    public void setRegisteredSuccessfully(boolean registeredSuccessfully) {
        this.registeredSuccessfully = registeredSuccessfully;
    }
}
