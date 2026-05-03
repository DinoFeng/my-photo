<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" @click="drawerOpen = !drawerOpen" />
        <q-toolbar-title>MyPhoto</q-toolbar-title>
        <q-space />
        <q-btn flat dense round icon="search" @click="showSearch = !showSearch" />
        <q-btn flat dense round icon="settings" to="/settings" />
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawerOpen" show-if-above>
      <q-list>
        <q-item-label header>相册</q-item-label>
        <q-item clickable to="/">
          <q-item-section avatar>
            <q-icon name="image" />
          </q-item-section>
          <q-item-section>全部照片</q-item-section>
        </q-item>
        <q-item clickable to="/albums">
          <q-item-section avatar>
            <q-icon name="folder" />
          </q-item-section>
          <q-item-section>我的相册</q-item-section>
        </q-item>
        <q-item-label header>系统相册</q-item-label>
        <q-item clickable>
          <q-item-section avatar>
            <q-icon name="calendar" />
          </q-item-section>
          <q-item-section>按日期</q-item-section>
        </q-item>
        <q-item clickable>
          <q-item-section avatar>
            <q-icon name="camera" />
          </q-item-section>
          <q-item-section>按相机</q-item-section>
        </q-item>
        <q-item clickable>
          <q-item-section avatar>
            <q-icon name="map-marker" />
          </q-item-section>
          <q-item-section>按地点</q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const drawerOpen = ref(false)
const showSearch = ref(false)
</script>
