#ifndef INPOSEXT_PRINTER_DEFINES_H
#define INPOSEXT_PRINTER_DEFINES_H

#include <stdint.h>

typedef enum
{
    AlignLeft  = 0,
    Centered   = 1,
    AlignRight = 2
} Alignment;

typedef struct
{
    Alignment alignment;
    uint8_t bold;
    uint8_t small;
} TextFormat;

typedef struct
{
    int32_t size;
    char data[512];
} ExternalPrinterBuffer;

#endif // INPOS_PRINTER_DEFINES_H
