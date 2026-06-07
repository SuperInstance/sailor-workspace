cmake_minimum_required(VERSION 3.14)
project(plato-engine-stm32f4 C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Toolchain file: user must provide or set -DCMAKE_TOOLCHAIN_FILE
if(NOT CMAKE_TOOLCHAIN_FILE)
    message(FATAL_ERROR "Set -DCMAKE_TOOLCHAIN_FILE=arm-none-eabi.cmake or provide your own")
endif()

# Source files
set(PLATO_SOURCES
    src/engine.c
    src/sensor.c
    src/alarm.c
    src/gate.c
    src/symmetry.c
    src/uart.c
    src/nail.c
)

set(PLATO_PLATFORM_SOURCES
    platform/stm32f4/adc.c
    platform/stm32f4/gpio.c
    platform/stm32f4/tim.c
    platform/stm32f4/uart.c
)

add_executable(plato-engine.elf
    main.c
    startup_stm32f4.s
    ${PLATO_SOURCES}
    ${PLATO_PLATFORM_SOURCES}
)

target_include_directories(plato-engine.elf PRIVATE
    include
    platform/stm32f4
)

target_compile_definitions(plato-engine.elf PRIVATE
    PLATO_PLATFORM_STM32F4
    STM32F407xx
    USE_HAL_DRIVER
)

target_link_options(plato-engine.elf PRIVATE
    -T stm32f4_flash.ld
    --specs=nosys.specs
    -Wl,--gc-sections
)
